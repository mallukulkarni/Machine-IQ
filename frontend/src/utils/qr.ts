const SIZE = 29
const DATA_CODEWORDS = 55
const ECC_CODEWORDS = 15

function gfMultiply(a: number, b: number): number {
  let result = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) result ^= a
    const highBit = a & 0x80
    a = (a << 1) & 0xff
    if (highBit) a ^= 0x1d
    b >>>= 1
  }
  return result
}

function gfPowerOfTwo(exponent: number): number {
  let value = 1
  for (let i = 0; i < exponent; i++) value = gfMultiply(value, 2)
  return value
}

function errorCorrection(data: number[]): number[] {
  let generator = [1]
  for (let i = 0; i < ECC_CODEWORDS; i++) {
    const next = new Array(generator.length + 1).fill(0)
    const root = gfPowerOfTwo(i)
    generator.forEach((value, index) => {
      next[index] ^= value
      next[index + 1] ^= gfMultiply(value, root)
    })
    generator = next
  }

  const remainder = [...data, ...new Array(ECC_CODEWORDS).fill(0)]
  for (let index = 0; index < data.length; index++) {
    const factor = remainder[index]
    generator.forEach((coefficient, offset) => {
      remainder[index + offset] ^= gfMultiply(coefficient, factor)
    })
  }
  return remainder.slice(data.length)
}

function appendBits(bits: number[], value: number, length: number) {
  for (let bit = length - 1; bit >= 0; bit--) bits.push((value >>> bit) & 1)
}

function makeCodewords(value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value))
  if (bytes.length > 53) throw new Error('Passport URL is too long for the QR code.')

  const bits: number[] = []
  appendBits(bits, 0b0100, 4)
  appendBits(bits, bytes.length, 8)
  bytes.forEach((byte) => appendBits(bits, byte, 8))
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length))
  while (bits.length % 8) bits.push(0)

  const data: number[] = []
  for (let index = 0; index < bits.length; index += 8) {
    data.push(bits.slice(index, index + 8).reduce((byte, bit) => (byte << 1) | bit, 0))
  }
  for (let pad = 0; data.length < DATA_CODEWORDS; pad++) data.push(pad % 2 === 0 ? 0xec : 0x11)
  return [...data, ...errorCorrection(data)]
}

function formatInformation(): number {
  const data = 0b01000
  let remainder = data << 10
  for (let bit = 14; bit >= 10; bit--) {
    if ((remainder >>> bit) & 1) remainder ^= 0x537 << (bit - 10)
  }
  return ((data << 10) | remainder) ^ 0x5412
}

export function createPassportQr(value: string): boolean[][] {
  const modules = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false))
  const reserved = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false))
  const setFunction = (row: number, column: number, dark: boolean) => {
    if (row >= 0 && row < SIZE && column >= 0 && column < SIZE) {
      modules[row][column] = dark
      reserved[row][column] = true
    }
  }

  const finder = (centerRow: number, centerColumn: number) => {
    for (let row = -1; row <= 7; row++) {
      for (let column = -1; column <= 7; column++) {
        const distance = Math.max(Math.abs(row), Math.abs(column))
        const inside = row >= 0 && row <= 6 && column >= 0 && column <= 6
        setFunction(centerRow + row, centerColumn + column, inside && distance !== 2)
      }
    }
  }
  finder(0, 0)
  finder(0, SIZE - 7)
  finder(SIZE - 7, 0)

  for (let index = 8; index < SIZE - 8; index++) {
    setFunction(6, index, index % 2 === 0)
    setFunction(index, 6, index % 2 === 0)
  }
  for (let row = -2; row <= 2; row++) {
    for (let column = -2; column <= 2; column++) {
      setFunction(SIZE - 7 + row, SIZE - 7 + column, Math.max(Math.abs(row), Math.abs(column)) !== 1)
    }
  }

  const format = formatInformation()
  const firstFormat: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  const secondFormat: [number, number][] = [
    [8, SIZE - 1], [8, SIZE - 2], [8, SIZE - 3], [8, SIZE - 4], [8, SIZE - 5],
    [8, SIZE - 6], [8, SIZE - 7], [8, SIZE - 8], [SIZE - 7, 8], [SIZE - 6, 8],
    [SIZE - 5, 8], [SIZE - 4, 8], [SIZE - 3, 8], [SIZE - 2, 8], [SIZE - 1, 8],
  ]
  firstFormat.forEach(([row, column], bit) => setFunction(row, column, ((format >>> bit) & 1) !== 0))
  secondFormat.forEach(([row, column], bit) => setFunction(row, column, ((format >>> bit) & 1) !== 0))
  setFunction(SIZE - 8, 8, true)

  const bits = makeCodewords(value).flatMap((byte) => Array.from({ length: 8 }, (_, bit) => (byte >>> (7 - bit)) & 1))
  let bitIndex = 0
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right--
    const upward = ((right + 1) & 2) === 0
    for (let offset = 0; offset < SIZE; offset++) {
      const row = upward ? SIZE - 1 - offset : offset
      for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
        const column = right - columnOffset
        if (reserved[row][column]) continue
        const bit = bitIndex < bits.length ? bits[bitIndex++] : 0
        modules[row][column] = (bit ^ Number((row + column) % 2 === 0)) !== 0
      }
    }
  }
  return modules
}
