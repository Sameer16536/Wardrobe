import google.generativeai as genai
import json
import re
from typing import List, Optional
from PIL import Image
import io

from app.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)

# Use Flash for free tier (fast + generous limits)
model = genai.GenerativeModel("gemini-1.5-flash")


async def analyze_clothing_image(image_bytes: bytes) -> dict:
    """
    Send clothing image to Gemini Vision → returns structured tags.
    Auto-detects: category, colors, seasons, occasions.
    """
    image = Image.open(io.BytesIO(image_bytes))

    prompt = """
    Analyze this clothing item image and respond ONLY with a valid JSON object.
    No explanation, no markdown, just raw JSON.

    JSON format:
    {
      "name": "suggested short name for the item",
      "category": "one of: shirt, t-shirt, pants, jeans, shorts, dress, skirt, jacket, coat, sweater, hoodie, shoes, sneakers, boots, heels, sandals, bag, hat, scarf, belt, accessory, other",
      "colors": ["primary color", "secondary color if any"],
      "seasons": ["summer", "winter", "spring", "autumn"] (pick all that apply),
      "occasions": ["casual", "formal", "party", "gym", "outdoor", "work"] (pick all that apply),
      "tags": ["material or style tags like: cotton, denim, floral, striped, vintage, oversized"],
      "confidence": 0.95
    }
    """

    try:
        response = model.generate_content([prompt, image])
        text = response.text.strip()
        # Strip markdown code fences if Gemini wraps in ```json
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        result = json.loads(text)
        return result
    except (json.JSONDecodeError, Exception) as e:
        # Return sensible defaults if AI fails
        return {
            "name": "Clothing Item",
            "category": "other",
            "colors": [],
            "seasons": ["summer", "winter", "spring", "autumn"],
            "occasions": ["casual"],
            "tags": [],
            "confidence": 0.0,
        }


async def suggest_outfits(wardrobe_items: List[dict], occasion: Optional[str] = None,
                          weather: Optional[str] = None, mood: Optional[str] = None) -> List[dict]:
    """
    Given user's wardrobe, ask Gemini to suggest outfit combinations.
    Returns list of item-id groups with explanations.
    """
    wardrobe_summary = "\n".join([
        f"- ID:{item['id']} | {item['name']} ({item['category']}) | Colors: {', '.join(item['colors'])} | Occasions: {', '.join(item['occasions'])}"
        for item in wardrobe_items[:50]  # cap at 50 items to stay within token limits
    ])

    context_parts = []
    if occasion:
        context_parts.append(f"Occasion: {occasion}")
    if weather:
        context_parts.append(f"Weather: {weather}")
    if mood:
        context_parts.append(f"Mood/Style: {mood}")
    context = " | ".join(context_parts) if context_parts else "casual everyday wear"

    prompt = f"""
    You are a personal stylist AI. Here is the user's wardrobe:

    {wardrobe_summary}

    Context: {context}

    Suggest 3 outfit combinations from the items above. Each outfit should be cohesive and stylish.
    Respond ONLY with a valid JSON array. No explanation. No markdown. Just raw JSON.

    Format:
    [
      {{
        "item_ids": ["id1", "id2", "id3"],
        "outfit_name": "Creative outfit name",
        "explanation": "Why this outfit works (1-2 sentences)",
        "occasion": "casual/formal/etc"
      }}
    ]
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception:
        return []


async def chat_with_stylist(message: str, wardrobe_summary: str, chat_history: List[dict] = []) -> str:
    """
    AI stylist chat — answers fashion questions using user's wardrobe context.
    """
    system_context = f"""
    You are a friendly, expert personal stylist AI assistant called 'StyleAI'.
    You help users make the most of their existing wardrobe.
    
    The user's wardrobe contains:
    {wardrobe_summary}
    
    Be concise, warm, and actionable. Give specific advice referencing their actual clothes.
    """

    full_prompt = f"{system_context}\n\nUser: {message}\n\nStyleAI:"

    try:
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return "I'm having trouble connecting right now. Please try again in a moment! 🤖"
