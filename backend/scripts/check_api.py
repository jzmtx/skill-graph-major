import requests
import json

res = requests.get("http://127.0.0.1:8000/api/roadmaps?role_name=Data%20Scientist&ecosystem=General")
data = res.json()
with open("d:/skillgraph/backend/api_output.json", "w") as f:
    json.dump(data, f, indent=2)
