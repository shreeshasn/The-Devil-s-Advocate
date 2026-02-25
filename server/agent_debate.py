import os
import time
from google import genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

app = Flask(__name__)
CORS(app)

def call_gemini_with_retry(prompt, max_retries=3):
    """Tries to call the API. If it gets a 503 or 429 busy error, it waits and tries again."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model='gemini-2.5-pro', contents=prompt)
            return response.text
        except Exception as e:
            error_msg = str(e)
            # If server is busy (503) or quota exhausted (429) and we have retries left
            if ("503" in error_msg or "429" in error_msg) and attempt < max_retries - 1:
                print(f"Server busy. Retrying attempt {attempt + 2} in 2 seconds...")
                time.sleep(2)  # Wait 2 seconds before trying again
                continue
            # If it's a different error or we ran out of retries, crash and report it
            raise e

def agent_a_proposer(topic):
    prompt = f"You are 'The Visionary' (Proposer). Topic: {topic}. Provide a punchy, highly concise argument supporting a strong stance. Do NOT write long paragraphs. Use exactly 3 to 4 short bullet points highlighting major striking points, records, or facts (e.g., specific stats). Keep it exciting, hard-hitting, and brief."
    return call_gemini_with_retry(prompt)

def agent_b_critic(topic, proposal):
    prompt = f"You are 'The Inquisitor' (Critic). Topic: {topic}. Proposal to attack: {proposal}. Aggressively but professionally tear down the proposal. Do NOT write long paragraphs. Use exactly 3 to 4 short bullet points highlighting counter-facts, better records, and logical flaws in their argument. Keep it extremely concise and factual."
    return call_gemini_with_retry(prompt)

def agent_c_judge(topic, proposal, critique):
    prompt = f"You are 'The Arbiter' (Judge). Topic: {topic}. Proposer argued: {proposal}. Critic argued: {critique}. Give a final, decisive verdict. Do NOT write long paragraphs. Give a bold 1-sentence conclusion declaring a winner, followed by 3 brief bullet points justifying the decision based on the most striking facts presented. Be definitive."
    return call_gemini_with_retry(prompt)

@app.route('/', methods=['GET'])
def home():
    return "The Multi-Agent Debate Server is running successfully!"

@app.route('/api/proposer', methods=['POST'])
def proposer():
    try:
        data = request.get_json()
        return jsonify({"proposal": agent_a_proposer(data['topic'])})
    except Exception as e:
        return jsonify({"error": f"API Error: {str(e)}"}), 500

@app.route('/api/critic', methods=['POST'])
def critic():
    try:
        data = request.get_json()
        return jsonify({"critique": agent_b_critic(data['topic'], data['proposal'])})
    except Exception as e:
        return jsonify({"error": f"API Error: {str(e)}"}), 500

@app.route('/api/judge', methods=['POST'])
def judge():
    try:
        data = request.get_json()
        return jsonify({"final_answer": agent_c_judge(data['topic'], data['proposal'], data['critique'])})
    except Exception as e:
        return jsonify({"error": f"API Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)