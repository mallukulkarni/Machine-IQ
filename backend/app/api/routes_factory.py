from fastapi import APIRouter, HTTPException
from app.services.factory_graph import factory_engine

router = APIRouter(prefix="/factory", tags=["factory"])

@router.get("/graph")
async def get_factory_graph():
    return factory_engine.get_graph_data()

@router.get("/impact/{material_id}")
async def get_impact(material_id: str, risk_score: float = 0.0, risk_level: str = "low"):
    result = factory_engine.analyze_impact(material_id, risk_score, risk_level)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/simulate-failure/{material_id}")
async def simulate_failure(material_id: str):
    result = factory_engine.simulate_failure(material_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/nodes")
async def list_nodes():
    data = factory_engine.get_graph_data()
    return {"nodes": data["nodes"], "total": len(data["nodes"])}

@router.get("/edges")
async def list_edges():
    data = factory_engine.get_graph_data()
    return {"edges": data["edges"], "total": len(data["edges"])}
