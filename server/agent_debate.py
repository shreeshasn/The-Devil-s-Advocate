import os
import time
from google import genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()
default_api_key = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app)

def get_client(custom_api_key):
    key = custom_api_key if custom_api_key else default_api_key
    if not key:
        raise ValueError("No API key provided. Please click the Settings icon (⚙️) to enter your Gemini API Key.")
    return genai.Client(api_key=key)

def call_gemini_with_retry(prompt, custom_api_key, model_name, max_retries=3):
    client = get_client(custom_api_key)
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
            return response.text
        except Exception as e:
            error_msg = str(e)
            if ("503" in error_msg or "429" in error_msg) and attempt < max_retries - 1:
                time.sleep(2)
                continue
            raise e

def agent_a_proposer(topic, length, api_key, model):
    if length == 'short':
        length_prompt = "Use exactly 2 extremely brief bullet points. Do NOT write paragraphs."
    elif length == 'enhanced':
        length_prompt = "Write a comprehensive introductory paragraph, followed by 4 to 5 highly detailed bullet points with deep insights, and a strong concluding paragraph."
    else:
        length_prompt = "Use exactly 3 to 4 short bullet points. Do NOT write long paragraphs."

    prompt = f"You are 'The Visionary'. Topic: {topic}. Provide a punchy argument supporting a strong stance on the topic. {length_prompt} **Use bold text** to highlight the most important points. CRUCIAL RULE: If the topic is vague, just a random name (like 'John Smith' or 'Shreesha'), or a simple number/phrase, debate its logical, cultural, or hypothetical significance based on real-world context. DO NOT hallucinate or invent fake financial data, market shares, ROI, or business statistics under any circumstances. Keep it exciting, logical, and relevant to the actual input."
    return call_gemini_with_retry(prompt, api_key, model)

def agent_b_critic(topic, proposal, length, api_key, model):
    if length == 'short':
        length_prompt = "Use exactly 2 extremely brief bullet points. Do NOT write paragraphs."
    elif length == 'enhanced':
        length_prompt = "Write a comprehensive introductory paragraph, followed by 4 to 5 highly detailed bullet points with deep insights, and a strong concluding paragraph."
    else:
        length_prompt = "Use exactly 3 to 4 short bullet points. Do NOT write long paragraphs."

    prompt = f"You are 'The Inquisitor'. Topic: {topic}. 'The Visionary' proposed: {proposal}. Aggressively but professionally tear down The Visionary's proposal. {length_prompt} **Crucially, use bold text (Markdown)** to highlight counter-arguments. Always refer to the first agent as 'The Visionary'. CRUCIAL RULE: If the topic is vague or just a name, attack the Visionary's logic using philosophical, logical, or cultural counter-points. DO NOT hallucinate fake financial data, business metrics, or false statistics. Keep it highly relevant to the provided text and strictly logical."
    return call_gemini_with_retry(prompt, api_key, model)

def agent_c_judge(topic, proposal, critique, length, api_key, model):
    if length == 'short':
        length_prompt = "followed by exactly 2 brief bullet points justifying the decision."
    elif length == 'enhanced':
        length_prompt = "followed by a detailed analysis paragraph weighing both arguments, and 4 to 5 highly detailed bullet points justifying the decision."
    else:
        length_prompt = "followed by 3 brief bullet points justifying the decision."

    prompt = f"You are 'The Arbiter'. Topic: {topic}. 'The Visionary' argued: {proposal}. 'The Inquisitor' argued: {critique}. Give a final, decisive verdict. CRUCIAL RULE: Your VERY FIRST SENTENCE must explicitly and directly answer the user's topic (e.g., explicitly naming the winner, the better option, or the direct answer to the prompt, like 'India is the superior choice over China because...' or 'The definitive answer is...'), {length_prompt} You MUST explicitly use the names 'The Visionary' and 'The Inquisitor' when referring to their arguments. **Use bold text** to highlight the winning points. DO NOT invent fake data."
    return call_gemini_with_retry(prompt, api_key, model)

@app.route('/', methods=['GET'])
def home():
    return "The Multi-Agent Debate Server is running successfully!"

@app.route('/api/status', methods=['GET'])
def status():
    has_key = default_api_key is not None and default_api_key.strip() != ""
    return jsonify({"hasDefaultKey": has_key})

@app.route('/api/proposer', methods=['POST'])
def proposer():
    try:
        data = request.get_json()
        return jsonify({"proposal": agent_a_proposer(data['topic'], data.get('length', 'medium'), data.get('api_key'), data.get('model', 'gemini-2.5-pro'))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/critic', methods=['POST'])
def critic():
    try:
        data = request.get_json()
        return jsonify({"critique": agent_b_critic(data['topic'], data['proposal'], data.get('length', 'medium'), data.get('api_key'), data.get('model', 'gemini-2.5-pro'))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/judge', methods=['POST'])
def judge():
    try:
        data = request.get_json()
        return jsonify({"final_answer": agent_c_judge(data['topic'], data['proposal'], data['critique'], data.get('length', 'medium'), data.get('api_key'), data.get('model', 'gemini-2.5-pro'))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)