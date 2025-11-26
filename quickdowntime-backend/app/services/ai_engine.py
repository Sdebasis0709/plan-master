import asyncio
import json
import re
from typing import Dict, List, Any
import google.generativeai as genai

MODEL_NAME = "models/gemini-2.5-flash"
ATTACHMENT_LOCAL_PATH = "/mnt/data/QuickDowntime.pptx.pdf"


class AIEngine:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        try:
            self.model = genai.GenerativeModel(self.model_name)
        except Exception:
            self.model = None

    def _build_prompt(self, event: Dict[str, Any], history: List[Dict[str, Any]]) -> str:
        history_snippet = json.dumps(history[-20:], indent=2, default=str)

        return f"""
You are an expert manufacturing engineer. 
Analyze the downtime and RETURN STRICT JSON ONLY.
** confidence score shoud be in 1-100 %.

Current Event:
{json.dumps(event, indent=2, default=str)}

History:
{history_snippet}

Attached report:
{ATTACHMENT_LOCAL_PATH}

Return EXACT JSON format:
{{
  "root_cause": "",
  "is_maintenance_required": true/false,
  "recommended_actions": [""],
  "preventive_measures": [""],
  "severity": "low|medium|high|critical",
  "predicted_next_failure": "",
  "confidence_score": 0%
}}

NO MARKDOWN  
NO ```  
NO extra explanation  
ONLY JSON.
"""

    def _call_model_sync(self, prompt: str) -> str:
        if self.model:
            resp = self.model.generate_content(prompt)
            return resp.text
        resp = genai.generate_text(model=self.model_name, prompt=prompt)
        return resp.text

    def _extract_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()

        # 1️⃣ Remove markdown ``` blocks if present
        text = text.replace("```json", "").replace("```", "").strip()

        # 2️⃣ Direct JSON parse
        try:
            return json.loads(text)
        except:
            pass

        # 3️⃣ Regex to extract first {…}
        match = re.search(r"\{(?:[^{}]|(?R))*\}", text, re.S)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass

        # 4️⃣ Fallback
        raise ValueError("Could not parse AI JSON output")

    async def analyze_downtime(self, event: Dict[str, Any], history: List[Dict[str, Any]]):
        prompt = self._build_prompt(event, history)

        # Run model in background thread
        try:
            raw = await asyncio.to_thread(self._call_model_sync, prompt)
        except Exception as e:
            return {
                "root_cause": "AI call failed",
                "is_maintenance_required": False,
                "recommended_actions": [],
                "preventive_measures": [],
                "severity": "unknown",
                "predicted_next_failure": "unknown",
                "confidence_score": 0,
                "error": str(e)
            }

        # Parse JSON
        try:
            parsed = self._extract_json(raw)
        except Exception:
            return {
                "root_cause": "AI returned unparseable JSON",
                "is_maintenance_required": False,
                "recommended_actions": [],
                "preventive_measures": [],
                "severity": "unknown",
                "predicted_next_failure": "unknown",
                "confidence_score": 0.0,
                "raw": raw
            }

        return {
            "root_cause": parsed.get("root_cause", ""),
            "is_maintenance_required": parsed.get("is_maintenance_required", False),
            "recommended_actions": parsed.get("recommended_actions", []),
            "preventive_measures": parsed.get("preventive_measures", []),
            "severity": parsed.get("severity", "unknown"),
            "predicted_next_failure": parsed.get("predicted_next_failure", "unknown"),
            "confidence_score": parsed.get("confidence_score", 0.0),
        }

    async def analyze_downtime_summary(self, summary_text: str, events: List[Dict[str, Any]]) -> str:
        """
        Analyze a summary of multiple downtime events for JSW Steel
        """
        prompt = f"""
You are an AI manufacturing analyst for JSW Steel plant.

Analyze the following downtime data and provide actionable insights:

{summary_text}

Provide a professional analysis covering:

1. KEY PATTERNS: What trends do you notice?
2. CRITICAL ISSUES: Which problems need immediate attention?
3. ROOT CAUSES: What are the underlying issues?
4. RECOMMENDATIONS: Specific preventive actions
5. IMPACT: Estimated production efficiency impact

Be concise, professional, and actionable. Focus on what maintenance managers can do NOW.

NO MARKDOWN. NO ```
Just plain text analysis.
"""

        try:
            # Run model in background thread
            raw = await asyncio.to_thread(self._call_model_sync, prompt)
            return raw.strip()
        except Exception as e:
            return f"⚠️ AI analysis temporarily unavailable. Error: {str(e)}\n\nPlease review the downtime data manually and contact support if this persists."


ai_engine = AIEngine()