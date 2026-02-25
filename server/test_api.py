import requests
import json

url = "http://localhost:5000/api/debate"
headers = {"Content-Type": "application/json"}
data = {"topic": "Should humans try to colonize Mars?"}

print("Sending request to server. Please wait, all 3 agents are debating...")

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print("\n=== AGENT A (PROPOSAL) ===")
    print(result['proposal'])
    print("\n=== AGENT B (CRITIQUE) ===")
    print(result['critique'])
    print("\n=== AGENT C (FINAL JUDGEMENT) ===")
    print(result['final_answer'])
else:
    print(f"Error: {response.status_code}")
    print(response.text)