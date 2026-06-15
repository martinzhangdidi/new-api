# -*- coding: utf-8 -*-
import os
import json
import requests
import datetime
import re
import streamlit as st

# Locate models_metadata.json
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
metadata_path = os.path.join(project_root, "web", "default", "public", "models_metadata.json")

# Modalities and Capabilities
MODALITIES = ["text", "image", "audio", "video", "file"]
CAPABILITIES = [
    "function_calling", "streaming", "vision", "json_mode",
    "structured_output", "reasoning", "tools", "system_prompt",
    "web_search", "code_interpreter", "caching", "embeddings"
]

# Map local Model IDs to OpenRouter IDs to resolve naming mismatch
MODEL_ALIASES = {
    "deepseek-reasoner": "deepseek/deepseek-r1",
    "deepseek-chat": "deepseek/deepseek-chat",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "o1": "openai/o1",
    "o3-mini": "openai/o3-mini",
    "claude-3-5-sonnet": "anthropic/claude-3-5-sonnet",
    "claude-3-5-haiku": "anthropic/claude-3-5-haiku",
    "gemini-1.5-pro": "google/gemini-1.5-pro",
    "gemini-2.0-flash": "google/gemini-2.0-flash",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "llama-3.1-70b-instruct": "meta-llama/llama-3.1-70b-instruct",
    "llama-3.3-70b-instruct": "meta-llama/llama-3.3-70b-instruct",
    "qwen-2.5-72b-instruct": "qwen/qwen-2.5-72b-instruct"
}

st.set_page_config(
    page_title="New API Model Metadata CMS",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State
if "selected_model" not in st.session_state:
    st.session_state.selected_model = None
if "openrouter_cache" not in st.session_state:
    st.session_state.openrouter_cache = None
if "models_dev_cache" not in st.session_state:
    st.session_state.models_dev_cache = None

# Helpers for metadata JSON
def load_metadata():
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            st.error(f"Failed to read metadata JSON: {e}")
    return {}

def save_metadata(data):
    try:
        os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        st.error(f"Failed to save metadata JSON: {e}")
        return False

def fetch_active_models(api_url):
    try:
        response = requests.get(f"{api_url}/api/pricing", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                models_data = data.get("data", [])
                return [m["model_name"] for m in models_data]
    except Exception as e:
        st.sidebar.warning(f"Could not connect to Go API ({api_url}). Please check if the backend service is running.")
    return []

def get_openrouter_models():
    if st.session_state.openrouter_cache is not None:
        return st.session_state.openrouter_cache
    try:
        with st.spinner("Fetching official OpenRouter models..."):
            resp = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                st.session_state.openrouter_cache = data
                return data
    except Exception as e:
        st.error(f"Failed to fetch OpenRouter data: {e}")
    return []

def get_models_dev_catalog():
    if st.session_state.models_dev_cache is not None:
        return st.session_state.models_dev_cache
    try:
        with st.spinner("Fetching models.dev catalog..."):
            resp = requests.get("https://models.dev/models.json", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                st.session_state.models_dev_cache = data
                return data
    except Exception as e:
        st.error(f"Failed to fetch models.dev API: {e}")
    return {}

def fetch_openrouter_full_description(or_id):
    url = f"https://openrouter.ai/{or_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return None
        html = resp.text
        
        # Decode NEXT.js push payloads
        push_payloads = []
        for m in re.finditer(r'self\.__next_f\.push\(\[\s*\d+\s*,\s*"(.*?)"\s*\]\)', html, re.DOTALL):
            s = m.group(1)
            try:
                decoded = json.loads(f'["{s}"]')[0]
                push_payloads.append(decoded)
            except Exception:
                pass
                
        full_payload = "".join(push_payloads)
        
        # Find description from full decoded payload
        matches = re.findall(r'"description":"((?:[^"\\]|\\.)*?)"', full_payload)
        if not matches:
            matches = re.findall(r'"description":"((?:[^"\\]|\\.)*?)"', html)
            
        if matches:
            valid_descs = []
            for m in matches:
                try:
                    desc = json.loads(f'["{m}"]')[0]
                    valid_descs.append(desc)
                except Exception:
                    desc = m.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    valid_descs.append(desc)
            
            # Prefer descriptions that do not end with truncation marker '...'
            non_trunc = [d for d in valid_descs if not d.endswith("...")]
            if non_trunc:
                best_desc = max(non_trunc, key=len)
            else:
                best_desc = max(valid_descs, key=len)
                
            if best_desc.strip():
                return best_desc.strip()
    except Exception:
        pass
    return None

def extract_parameter_count(desc, name):
    # Try description extraction first
    if desc:
        moe_patterns = [
            r'(\b\d+(?:\.\d+)?\s*(?:B|billion)\s*(?:total)?\s*parameters?)\s+(?:and|/)\s*(\b\d+(?:\.\d+)?\s*(?:B|billion)\s*(?:activated|active)?\s*parameters?)',
            r'(\b\d+(?:\.\d+)?\s*(?:B|billion)\s*total)\s*(?:parameters?)?\s*(?:and|/)\s*(\b\d+(?:\.\d+)?\s*(?:B|billion)\s*active)',
        ]
        for pattern in moe_patterns:
            match = re.search(pattern, desc, re.IGNORECASE)
            if match:
                p1 = match.group(1).strip()
                p2 = match.group(2).strip()
                def clean_part(p):
                    p = re.sub(r'\s+parameters?', '', p, flags=re.IGNORECASE)
                    p = re.sub(r'\s+activated', ' active', p, flags=re.IGNORECASE)
                    return p
                return f"{clean_part(p1)} / {clean_part(p2)}"
                
        dense_patterns = [
            r'\b(\d+(?:\.\d+)?\s*(?:B|billion|M|million)\s*(?:active|dense)?\s*parameters?)\b',
            r'\b(\d+(?:\.\d+)?\s*(?:B|billion|M|million)\s*parameters?)\b',
        ]
        for pattern in dense_patterns:
            match = re.search(pattern, desc, re.IGNORECASE)
            if match:
                p = match.group(1).strip()
                p = re.sub(r'\s+billion', 'B', p, flags=re.IGNORECASE)
                p = re.sub(r'\s+million', 'M', p, flags=re.IGNORECASE)
                p = re.sub(r'\s+parameters?', '', p, flags=re.IGNORECASE)
                return p.strip()
                
    # Fallback to name extraction
    if name:
        match = re.search(r'\b(\d+(?:\.\d+)?[bm])\b', name, re.IGNORECASE)
        if match:
            return match.group(1).upper()
            
    return "Unknown"

def fetch_huggingface_parameters(hf_url):
    if not hf_url:
        return None
    match = re.search(r'huggingface\.co/([^/]+/[^/]+?)(?:\.git|/|$)', hf_url)
    if not match:
        return None
    repo_id = match.group(1)
    api_url = f"https://huggingface.co/api/models/{repo_id}"
    try:
        resp = requests.get(api_url, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            total = data.get("safetensors", {}).get("total")
            if total:
                total = int(total)
                if total >= 1_000_000_000:
                    val = total / 1_000_000_000
                    return f"{int(val)}B" if val.is_integer() else f"{round(val, 1)}B"
                elif total >= 1_000_000:
                    val = total / 1_000_000
                    return f"{int(val)}M" if val.is_integer() else f"{round(val, 1)}M"
    except Exception:
        pass
    return None

# App Title
st.title("🤖 New API Model Metadata CMS")
st.markdown("This tool manages model metadata (context window, parameter count, release date, modalities, capabilities, and descriptions) displayed on the `/pricing` page. Changes are stored in `models_metadata.json` and loaded dynamically by the frontend, bypasses database/backend modifications.")

# Sidebar System Connection
st.sidebar.header("⚙️ Connection Settings")
api_url = st.sidebar.text_input("New API Backend URL", value="http://localhost:3001")

# Load models
active_models = fetch_active_models(api_url)
metadata = load_metadata()

# Model Categorization
unmatched_models = [m for m in active_models if m not in metadata]
matched_models = sorted(list(metadata.keys()))

st.sidebar.header("📁 Model Directory")

# 1. Pending Models (Active in Gateway but no custom metadata)
st.sidebar.subheader(f"⚠️ Pending Models ({len(unmatched_models)})")
for model in sorted(unmatched_models):
    if st.sidebar.button(f"🔴 {model}", key=f"sidebar_unmatched_{model}"):
        st.session_state.selected_model = model
        st.session_state.pop("form_context_length", None)
        st.session_state.pop("form_max_output", None)
        st.session_state.pop("form_cutoff", None)
        st.session_state.pop("form_release", None)
        st.session_state.pop("form_params", None)
        st.session_state.pop("form_inputs", None)
        st.session_state.pop("form_outputs", None)
        st.session_state.pop("form_caps", None)
        st.session_state.pop("form_desc", None)
        st.session_state.pop("form_save_key", None)
        st.session_state.pop("form_release_source", None)
        st.session_state.pop("form_cutoff_source", None)
        st.session_state.pop("form_desc_source", None)

# 2. Configured Models (Custom metadata exists)
st.sidebar.subheader(f"🟢 Configured Models ({len(matched_models)})")
for model in matched_models:
    label = f"🟢 {model}" if model in active_models else f"⚪ {model} (Not Active in Gateway)"
    if st.sidebar.button(label, key=f"sidebar_matched_{model}"):
        st.session_state.selected_model = model
        st.session_state.pop("form_context_length", None)
        st.session_state.pop("form_max_output", None)
        st.session_state.pop("form_cutoff", None)
        st.session_state.pop("form_release", None)
        st.session_state.pop("form_params", None)
        st.session_state.pop("form_inputs", None)
        st.session_state.pop("form_outputs", None)
        st.session_state.pop("form_caps", None)
        st.session_state.pop("form_desc", None)
        st.session_state.pop("form_save_key", None)
        st.session_state.pop("form_release_source", None)
        st.session_state.pop("form_cutoff_source", None)
        st.session_state.pop("form_desc_source", None)

# 3. OpenRouter Exclusive Models (Present in OR but not in local gateway)
or_models = get_openrouter_models()
or_only_models = []
existing_names = {am.lower() for am in active_models}.union({mk.lower() for mk in metadata.keys()})

if or_models:
    for om in or_models:
        or_id = om["id"]
        short_name = or_id.split("/")[-1]
        if short_name.lower() not in existing_names and or_id.lower() not in existing_names:
            or_only_models.append(om)

st.sidebar.subheader(f"🌐 OpenRouter Exclusive ({len(or_only_models)})")
or_search = st.sidebar.text_input("🔍 Search OpenRouter Models", value="", key="or_search_input")

filtered_or_models = []
if or_only_models:
    for om in or_only_models:
        if or_search.lower() in om["id"].lower():
            filtered_or_models.append(om)

max_display = 25
display_models = filtered_or_models[:max_display]

if display_models:
    for om in display_models:
        or_id = om["id"]
        if st.sidebar.button(f"🌐 {or_id}", key=f"sidebar_or_{or_id}"):
            st.session_state.selected_model = f"__or__:{or_id}"
            st.session_state.pop("form_context_length", None)
            st.session_state.pop("form_max_output", None)
            st.session_state.pop("form_cutoff", None)
            st.session_state.pop("form_release", None)
            st.session_state.pop("form_params", None)
            st.session_state.pop("form_inputs", None)
            st.session_state.pop("form_outputs", None)
            st.session_state.pop("form_caps", None)
            st.session_state.pop("form_desc", None)
            st.session_state.pop("form_save_key", None)
            st.session_state.pop("form_release_source", None)
            st.session_state.pop("form_cutoff_source", None)
            st.session_state.pop("form_desc_source", None)
    if len(filtered_or_models) > max_display:
        st.sidebar.caption(f"... {len(filtered_or_models) - max_display} more, refine search criteria")
else:
    st.sidebar.caption("No matching OpenRouter exclusive models")


# Main Workspace Logic
selected = st.session_state.selected_model

if selected:
    is_or_only = selected.startswith("__or__:")
    
    if is_or_only:
        or_id = selected.replace("__or__:", "")
        short_name = or_id.split("/")[-1]
        st.header(f"🆕 Configure OpenRouter Exclusive Model: `{or_id}`")
        st.info("💡 This model is not active in your gateway. You can pre-configure and save its metadata. The saved Model ID (Key) must match the name you configure in the gateway in the future.")
        matched_or = next((m for m in or_models if m["id"] == or_id), None)
    else:
        st.header(f"✏️ Edit Model Metadata: `{selected}`")
        matched_or = None

    # Helper function to initialize form by merging models.dev (accurate release/cutoff) and OpenRouter (pricing/params)
    def initialize_form(target_name, matched_or_data):
        dev_catalog = get_models_dev_catalog()
        matched_dev = None
        
        # Determine lookup IDs for models.dev
        check_ids = [target_name.lower()]
        if matched_or_data:
            check_ids.append(matched_or_data["id"].lower())
            check_ids.append(matched_or_data["id"].split("/")[-1].lower())
            
        # Match with models.dev registry
        for dev_id, dev_data in dev_catalog.items():
            dev_id_lower = dev_id.lower()
            dev_id_short = dev_id_lower.split("/")[-1]
            if any(dev_id_lower == cid or dev_id_short == cid or cid.endswith("/" + dev_id_short) for cid in check_ids):
                matched_dev = dev_data
                break

        if matched_or_data or matched_dev:
            # --- Context & Output Limits (models.dev > OpenRouter) ---
            if matched_dev and "limit" in matched_dev:
                st.session_state.form_context_length = int(matched_dev["limit"].get("context", 8192))
                st.session_state.form_max_output = int(matched_dev["limit"].get("output", 4096))
            elif matched_or_data:
                st.session_state.form_context_length = int(matched_or_data.get("context_length", 8192))
                st.session_state.form_max_output = 4096 if st.session_state.form_context_length >= 16384 else 2048
            else:
                st.session_state.form_context_length = 8192
                st.session_state.form_max_output = 4096

            # --- Description (OpenRouter Scraper > OpenRouter API > models.dev) ---
            desc_val = ""
            if matched_or_data:
                or_id_to_scrape = matched_or_data.get("id")
                if or_id_to_scrape:
                    with st.spinner(f"Scraping full description for {or_id_to_scrape}..."):
                        full_desc = fetch_openrouter_full_description(or_id_to_scrape)
                    if full_desc:
                        desc_val = full_desc
                        st.session_state.form_desc_source = "OpenRouter Web Scraper (Full)"
                    else:
                        desc_val = matched_or_data.get("description", "")
                        st.session_state.form_desc_source = "OpenRouter API (Truncated)"
                else:
                    desc_val = matched_or_data.get("description", "")
                    st.session_state.form_desc_source = "OpenRouter API (Truncated)"
            elif matched_dev and matched_dev.get("name"):
                desc_val = f"Community tracked metadata for {matched_dev['name']}."
                st.session_state.form_desc_source = "models.dev"
            else:
                desc_val = ""
                st.session_state.form_desc_source = "default"
            
            st.session_state.form_desc = desc_val

            # --- Parameter Count (OpenRouter > models.dev) ---
            params = "Unknown"
            if matched_or_data:
                arch = matched_or_data.get("architecture", {})
                params = arch.get("parameters", "Unknown")
                if not params or params == "none" or params == "Unknown":
                    params = extract_parameter_count(desc_val, target_name)
            else:
                params = extract_parameter_count(desc_val, target_name)

            # Try Hugging Face fallback if still Unknown
            if params == "Unknown" and matched_dev and "weights" in matched_dev:
                for w in matched_dev["weights"]:
                    if "huggingface.co" in w.get("url", ""):
                        with st.spinner("Fetching parameter count from Hugging Face..."):
                            hf_params = fetch_huggingface_parameters(w["url"])
                        if hf_params:
                            params = hf_params
                            break
            st.session_state.form_params = params

            # --- Modalities (models.dev > OpenRouter) ---
            if matched_dev and "modalities" in matched_dev:
                dev_inputs = matched_dev["modalities"].get("input", ["text"])
                dev_outputs = matched_dev["modalities"].get("output", ["text"])
                st.session_state.form_inputs = [m for m in dev_inputs if m in MODALITIES]
                st.session_state.form_outputs = [m for m in dev_outputs if m in MODALITIES]
            elif matched_or_data:
                arch = matched_or_data.get("architecture", {})
                modalities = arch.get("modality", "text->text").split("->")
                inputs = [m.strip() for m in modalities[0].split("+") if m.strip() in MODALITIES]
                st.session_state.form_inputs = inputs if inputs else ["text"]
                st.session_state.form_outputs = [m.strip() for m in modalities[1].split("+") if m.strip() in MODALITIES] if len(modalities) > 1 else ["text"]
            else:
                st.session_state.form_inputs = ["text"]
                st.session_state.form_outputs = ["text"]

            # --- Capabilities (models.dev > OpenRouter) ---
            st.session_state.form_caps = ["streaming", "system_prompt"]
            if "image" in st.session_state.form_inputs:
                st.session_state.form_caps.append("vision")
                
            if matched_dev:
                if matched_dev.get("reasoning"):
                    st.session_state.form_caps.append("reasoning")
                if matched_dev.get("tool_call"):
                    st.session_state.form_caps.append("tools")
                if matched_dev.get("structured_output"):
                    st.session_state.form_caps.append("structured_output")
            elif matched_or_data:
                if matched_or_data.get("tools"):
                    st.session_state.form_caps.append("tools")
                if matched_or_data.get("function_calling"):
                    st.session_state.form_caps.append("function_calling")

            # --- Release Date Determination (models.dev > OpenRouter 'created') ---
            if matched_dev and matched_dev.get("release_date"):
                st.session_state.form_release = matched_dev["release_date"]
                st.session_state.form_release_source = "models.dev"
            elif matched_or_data and matched_or_data.get("created"):
                try:
                    release_dt = datetime.datetime.fromtimestamp(matched_or_data["created"])
                    st.session_state.form_release = release_dt.strftime("%Y-%m-%d")
                    st.session_state.form_release_source = "OpenRouter API"
                except Exception:
                    st.session_state.form_release = ""
                    st.session_state.form_release_source = "empty"
            else:
                st.session_state.form_release = ""
                st.session_state.form_release_source = "empty"

            # --- Cutoff Date Determination (models.dev > OpenRouter API) ---
            if matched_dev and matched_dev.get("knowledge"):
                st.session_state.form_cutoff = matched_dev["knowledge"]
                st.session_state.form_cutoff_source = "models.dev"
            elif matched_or_data and matched_or_data.get("knowledge_cutoff"):
                api_cutoff = matched_or_data["knowledge_cutoff"]
                if "-" in api_cutoff:
                    parts = api_cutoff.split("-")
                    st.session_state.form_cutoff = f"{parts[0]}-{parts[1]}" if len(parts) >= 2 else api_cutoff
                else:
                    st.session_state.form_cutoff = api_cutoff
                st.session_state.form_cutoff_source = "OpenRouter API"
            else:
                st.session_state.form_cutoff = ""
                st.session_state.form_cutoff_source = "empty"
        else:
            # Complete default fallback
            st.session_state.form_context_length = 8192
            st.session_state.form_max_output = 4096
            st.session_state.form_cutoff = ""
            st.session_state.form_release = ""
            st.session_state.form_params = "Unknown"
            st.session_state.form_inputs = ["text"]
            st.session_state.form_outputs = ["text"]
            st.session_state.form_caps = ["streaming", "system_prompt"]
            st.session_state.form_desc = ""
            st.session_state.form_release_source = "default"
            st.session_state.form_cutoff_source = "default"
            st.session_state.form_desc_source = "default"

    # Detect first-load and populate session state
    if "form_context_length" not in st.session_state:
        if is_or_only:
            initialize_form(short_name, matched_or)
        else:
            if selected in metadata:
                specs = metadata[selected]
                st.session_state.form_context_length = int(specs.get("context_length", 8192))
                st.session_state.form_max_output = int(specs.get("max_output_tokens", 4096))
                st.session_state.form_cutoff = specs.get("knowledge_cutoff", "")
                st.session_state.form_release = specs.get("release_date", "")
                st.session_state.form_params = specs.get("parameter_count", "Unknown")
                st.session_state.form_inputs = specs.get("input_modalities", ["text"])
                st.session_state.form_outputs = specs.get("output_modalities", ["text"])
                st.session_state.form_caps = specs.get("capabilities", ["streaming", "system_prompt"])
                st.session_state.form_desc = specs.get("description", "")
                st.session_state.form_release_source = "saved"
                st.session_state.form_cutoff_source = "saved"
                st.session_state.form_desc_source = "saved"
            else:
                # Find best matching OpenRouter ID
                best_or = None
                if or_models:
                    or_options = [m["id"] for m in or_models]
                    selected_lower = selected.lower()
                    
                    mapped_or_id = MODEL_ALIASES.get(selected_lower)
                    if mapped_or_id and mapped_or_id in or_options:
                        best_or = next((m for m in or_models if m["id"] == mapped_or_id), None)
                    else:
                        # Fallback fuzzy matching
                        selected_fuzzy = selected_lower.replace("-", "/")
                        # Try exact match on short name first
                        for om in or_models:
                            opt_lower = om["id"].lower()
                            opt_short = opt_lower.split("/")[-1]
                            if opt_short == selected_lower:
                                best_or = om
                                break
                        if not best_or:
                            for om in or_models:
                                opt_lower = om["id"].lower()
                                if selected_fuzzy in opt_lower or opt_lower in selected_fuzzy:
                                    best_or = om
                                    break
                initialize_form(selected, best_or)

    # --- OpenRouter Data Linking / Matching ---
    st.subheader("🔍 OpenRouter Official Data Linkage")
    if or_models:
        or_options = [m["id"] for m in or_models]
        
        if is_or_only:
            st.info(f"Automatically linked OpenRouter Model ID: `{or_id}`")
            if st.button("⚡ Reload & Resync Data", use_container_width=True):
                initialize_form(short_name, matched_or)
                st.toast("🔮 Data successfully re-synced!", icon="✨")
        else:
            # Auto match index based on MODEL_ALIASES or fuzzy logic
            best_match_idx = 0
            selected_lower = selected.lower()
            mapped_or_id = MODEL_ALIASES.get(selected_lower)
            
            if mapped_or_id and mapped_or_id in or_options:
                best_match_idx = or_options.index(mapped_or_id)
            else:
                # Try exact short name match first
                found_match = False
                for idx, opt in enumerate(or_options):
                    opt_lower = opt.lower()
                    opt_short = opt_lower.split("/")[-1]
                    if opt_short == selected_lower:
                        best_match_idx = idx
                        found_match = True
                        break
                if not found_match:
                    selected_fuzzy = selected_lower.replace("-", "/")
                    for idx, opt in enumerate(or_options):
                        opt_lower = opt.lower()
                        if selected_fuzzy in opt_lower or opt_lower in selected_fuzzy:
                            best_match_idx = idx
                            break
                    
            col_search, col_btn = st.columns([3, 1])
            with col_search:
                selected_or_id = st.selectbox(
                    "Link with OpenRouter Model",
                    options=or_options,
                    index=best_match_idx
                )
            with col_btn:
                st.write("") # Spacer
                st.write("")
                if st.button("⚡ Import & Sync Data", use_container_width=True):
                    matched_or_selected = next((m for m in or_models if m["id"] == selected_or_id), None)
                    initialize_form(selected, matched_or_selected)
                    st.toast("🔮 Data imported and synced successfully!", icon="✨")
    else:
        st.info("Unable to fetch OpenRouter data. You can fill in the parameters manually.")

    st.write("---")

    # Show precise Data Sources (Resolves the website vs API metadata discrepancy)
    sources = []
    if st.session_state.get("form_release_source"):
        sources.append(f"Release Date is retrieved from **{st.session_state.form_release_source}**.")
    if st.session_state.get("form_cutoff_source"):
        sources.append(f"Knowledge Cutoff is retrieved from **{st.session_state.form_cutoff_source}**.")
    if st.session_state.get("form_desc_source"):
        sources.append(f"Description is retrieved from **{st.session_state.form_desc_source}**.")
        
    if sources:
        for src in sources:
            st.success("📡 " + src)

    # --- Form Input Fields ---
    st.subheader("📝 Metadata Configuration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        context_len = st.number_input(
            "Context Window Limit (tokens)",
            value=st.session_state.form_context_length,
            step=1024,
            key="form_context_length"
        )
        max_output = st.number_input(
            "Max Output Tokens",
            value=st.session_state.form_max_output,
            step=512,
            key="form_max_output"
        )
        cutoff = st.text_input(
            "Knowledge Cutoff (YYYY-MM)",
            value=st.session_state.form_cutoff,
            key="form_cutoff",
            help="E.g., 2025-01. Mapped dynamically from models.dev or OpenRouter API."
        )
        release = st.text_input(
            "Release Date (YYYY-MM-DD)",
            value=st.session_state.form_release,
            key="form_release",
            help="E.g., 2026-04-24. Mapped directly from models.dev or OpenRouter creation timestamp."
        )
        params_cnt = st.text_input(
            "Parameter Count (e.g., 8B, 70B, 284B total / 13B active)",
            value=st.session_state.form_params,
            key="form_params"
        )
        
    with col2:
        inputs = st.multiselect(
            "Input Modalities",
            options=MODALITIES,
            default=st.session_state.form_inputs,
            key="form_inputs"
        )
        outputs = st.multiselect(
            "Output Modalities",
            options=MODALITIES,
            default=st.session_state.form_outputs,
            key="form_outputs"
        )
        caps = st.multiselect(
            "Capabilities",
            options=CAPABILITIES,
            default=st.session_state.form_caps,
            key="form_caps"
        )
        
    desc = st.text_area(
        "Model Description (Supports HTML and Markdown)",
        value=st.session_state.form_desc,
        height=150,
        key="form_desc"
    )
    
    st.write("---")
    
    # Save Key Determination
    if is_or_only:
        save_key = st.text_input(
            "💾 Model ID (Key) to save in metadata",
            value=st.session_state.get("form_save_key", short_name),
            key="form_save_key",
            help="This key should match the exact model name that you will configure in the gateway later."
        )
    else:
        save_key = selected

    # Save / Delete Buttons
    col_save, col_del, _ = st.columns([1, 1, 4])
    
    with col_save:
        if st.button("💾 Save Configuration", type="primary", use_container_width=True):
            metadata[save_key] = {
                "context_length": context_len,
                "max_output_tokens": max_output,
                "knowledge_cutoff": cutoff,
                "release_date": release,
                "parameter_count": params_cnt,
                "input_modalities": inputs,
                "output_modalities": outputs,
                "capabilities": caps,
                "description": desc
            }
            if save_metadata(metadata):
                st.success(f"🎉 Metadata for `{save_key}` saved successfully!")
                st.balloons()
                st.session_state.selected_model = save_key
                st.session_state.pop("form_context_length", None)
                st.session_state.pop("form_max_output", None)
                st.session_state.pop("form_cutoff", None)
                st.session_state.pop("form_release", None)
                st.session_state.pop("form_params", None)
                st.session_state.pop("form_inputs", None)
                st.session_state.pop("form_outputs", None)
                st.session_state.pop("form_caps", None)
                st.session_state.pop("form_desc", None)
                st.session_state.pop("form_save_key", None)
                st.session_state.pop("form_release_source", None)
                st.session_state.pop("form_cutoff_source", None)
                st.session_state.pop("form_desc_source", None)
                st.rerun()
                
    with col_del:
        if (not is_or_only and selected in metadata) or (is_or_only and save_key in metadata):
            key_to_del = save_key if is_or_only else selected
            if st.button("🗑️ Delete Configuration", type="secondary", use_container_width=True):
                if key_to_del in metadata:
                    del metadata[key_to_del]
                if save_metadata(metadata):
                    st.success(f"🗑️ Deleted `{key_to_del}` custom metadata configuration!")
                    st.session_state.selected_model = None
                    st.session_state.pop("form_context_length", None)
                    st.session_state.pop("form_max_output", None)
                    st.session_state.pop("form_cutoff", None)
                    st.session_state.pop("form_release", None)
                    st.session_state.pop("form_params", None)
                    st.session_state.pop("form_inputs", None)
                    st.session_state.pop("form_outputs", None)
                    st.session_state.pop("form_caps", None)
                    st.session_state.pop("form_desc", None)
                    st.session_state.pop("form_save_key", None)
                    st.session_state.pop("form_release_source", None)
                    st.session_state.pop("form_cutoff_source", None)
                    st.session_state.pop("form_desc_source", None)
                    st.rerun()
else:
    st.info("👈 Please select a model from the left sidebar to start editing or configuring.")
