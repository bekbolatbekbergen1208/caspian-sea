from fastapi.testclient import TestClient
import main

def test_health_and_auth(monkeypatch):
    monkeypatch.setenv('GEO_API_KEY','test-key-only')
    client=TestClient(main.app)
    assert client.get('/health').json()['algorithm']=='ndwi-scl-v1.0.0'
    assert client.get('/jobs/missing').status_code==401
    assert client.get('/jobs/missing',headers={'X-API-Key':'test-key-only'}).status_code==404

def test_invalid_input_never_starts_job(monkeypatch):
    monkeypatch.setenv('GEO_API_KEY','test-key-only')
    client=TestClient(main.app)
    response=client.post('/jobs',headers={'X-API-Key':'test-key-only'},json={'bbox':[0,0,1,1],'before':'2024-10-01','after':'2024-01-01','region':'aktau'})
    assert response.status_code==422

def test_shadow_classes_are_invalid():
    import numpy as np
    from processing import classify
    b=np.ones((5,2,2),dtype=np.float32)
    b[0]=.3;b[1]=.1;b[3]=np.array([[2,3],[4,6]])
    _,_,valid,_=classify(b)
    assert valid.tolist()==[[False,False],[True,True]]
