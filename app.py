"""
app.py
Flask web server for Intelligent NoSQL Database & Wine Classification Project.
Coursework CA2 - CSE 494
Student: Gunda Venkatasai (Reg: 12314012, Sec: K223QR)
Instructor: RICHA [32366] | Lovely Professional University
"""

import os
import json
import time
import re
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory
import joblib
import numpy as np
import pandas as pd
from db import db_manager, DB_NAME, COLLECTION_NAME

app = Flask(__name__, static_folder="static", template_folder="templates")

BASE_DIR = Path(__file__).parent
OUTPUTS_DIR = BASE_DIR / "outputs"

# Load trained models & artifacts
MODELS = {}
SCALER = None
METRICS_DATA = {}
EDA_DATA = {}

def load_artifacts():
    global MODELS, SCALER, METRICS_DATA, EDA_DATA
    try:
        if (OUTPUTS_DIR / "random_forest_model.pkl").exists():
            MODELS["random_forest"] = joblib.load(OUTPUTS_DIR / "random_forest_model.pkl")
        if (OUTPUTS_DIR / "logistic_regression_model.pkl").exists():
            MODELS["logistic_regression"] = joblib.load(OUTPUTS_DIR / "logistic_regression_model.pkl")
        if (OUTPUTS_DIR / "decision_tree_model.pkl").exists():
            MODELS["decision_tree"] = joblib.load(OUTPUTS_DIR / "decision_tree_model.pkl")
        if (OUTPUTS_DIR / "scaler.pkl").exists():
            SCALER = joblib.load(OUTPUTS_DIR / "scaler.pkl")
        if (OUTPUTS_DIR / "evaluation_metrics.json").exists():
            with open(OUTPUTS_DIR / "evaluation_metrics.json") as f:
                METRICS_DATA = json.load(f)
        if (OUTPUTS_DIR / "eda_summary.json").exists():
            with open(OUTPUTS_DIR / "eda_summary.json") as f:
                EDA_DATA = json.load(f)
        print("Model artifacts loaded successfully:", list(MODELS.keys()))
    except Exception as e:
        print("Error loading artifacts:", e)

load_artifacts()

FEATURE_COLS = [
    "alcohol", "malic_acid", "ash", "alcalinity_of_ash", "magnesium",
    "total_phenols", "flavanoids", "nonflavanoid_phenols", "proanthocyanins",
    "color_intensity", "hue", "od280_od315", "proline"
]

FEATURE_LABELS = {
    "alcohol": "Alcohol (% vol)",
    "malic_acid": "Malic Acid (g/L)",
    "ash": "Ash Content (g/L)",
    "alcalinity_of_ash": "Alcalinity of Ash (mEq/L)",
    "magnesium": "Magnesium (mg/L)",
    "total_phenols": "Total Phenols (g/L)",
    "flavanoids": "Flavanoids (g/L)",
    "nonflavanoid_phenols": "Nonflavanoid Phenols (g/L)",
    "proanthocyanins": "Proanthocyanins (g/L)",
    "color_intensity": "Color Intensity",
    "hue": "Hue Ratio",
    "od280_od315": "OD280/OD315 Ratio",
    "proline": "Proline (mg/L)"
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def get_status():
    status = db_manager.get_status()
    status["models_loaded"] = list(MODELS.keys())
    status["report_info"] = {
        "student": "Gunda Venkatasai",
        "registration_no": "12314012",
        "section": "K223QR",
        "subject": "INTELLIGENT NOSQL DATABASE (CSE 494)",
        "submitted_to": "RICHA [32366]",
        "institution": "Lovely Professional University",
        "dataset": "UCI Wine (3-Class Classification, 178 instances, 13 features)"
    }
    return jsonify(status)

@app.route("/api/reconnect", methods=["POST"])
def reconnect_db():
    data = request.get_json(silent=True) or {}
    new_uri = data.get("uri", "").strip()
    if new_uri:
        os.environ["MONGODB_URI"] = new_uri
    db_manager.connect()
    return jsonify(db_manager.get_status())

@app.route("/api/data/summary", methods=["GET"])
def get_data_summary():
    if not EDA_DATA:
        load_artifacts()
    return jsonify({
        "summary": EDA_DATA,
        "feature_labels": FEATURE_LABELS
    })

@app.route("/api/data/samples", methods=["GET"])
def get_samples():
    class_filter = request.args.get("class", "").strip()
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sortBy", "").strip()
    sort_dir = int(request.args.get("sortDir", 1))
    page = max(1, int(request.args.get("page", 1)))
    page_size = max(5, min(100, int(request.args.get("pageSize", 15))))
    
    query = {}
    if class_filter:
        query["class"] = class_filter
    
    all_matched = db_manager.find(query=query)
    
    # Optional search across numeric features
    if search:
        s_lower = search.lower()
        def matches_search(doc):
            if s_lower in str(doc.get("class", "")).lower():
                return True
            for f in FEATURE_COLS:
                if s_lower in str(doc.get(f, "")):
                    return True
            return False
        all_matched = [d for d in all_matched if matches_search(d)]
        
    total_count = len(all_matched)
    
    # Sort
    if sort_by and sort_by in (FEATURE_COLS + ["class"]):
        all_matched.sort(key=lambda x: x.get(sort_by, 0), reverse=(sort_dir == -1))
        
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_records = all_matched[start_idx:end_idx]
    
    return jsonify({
        "records": page_records,
        "total": total_count,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, (total_count + page_size - 1) // page_size)
    })

@app.route("/api/sample-presets", methods=["GET"])
def get_sample_presets():
    # Retrieve 3 real representatives from the dataset
    c1 = db_manager.find({"class": "Cultivar_1"}, limit=1)
    c2 = db_manager.find({"class": "Cultivar_2"}, limit=1)
    c3 = db_manager.find({"class": "Cultivar_3"}, limit=1)
    
    return jsonify({
        "Cultivar_1": c1[0] if c1 else None,
        "Cultivar_2": c2[0] if c2 else None,
        "Cultivar_3": c3[0] if c3 else None,
        "feature_cols": FEATURE_COLS
    })

def parse_and_execute_mongosh(command_str):
    """
    Parses common mongosh commands from Section 6 of report or arbitrary queries.
    """
    cmd = command_str.strip()
    
    # Case: use WineAnalysisDB
    if cmd.startswith("use "):
        db_target = cmd.split()[1]
        return {
            "type": "command",
            "message": f"switched to db {db_target}",
            "data": {"database": db_target}
        }
        
    # Case: show collections
    if cmd in ("show collections", "show dbs"):
        return {
            "type": "collections",
            "data": [COLLECTION_NAME]
        }
        
    # Case: db.wine_samples.countDocuments(...)
    if "countDocuments" in cmd:
        inner = re.search(r"countDocuments\s*\(\s*(\{.*\}|)\s*\)", cmd, re.DOTALL)
        query = {}
        if inner and inner.group(1):
            try:
                # Replace unquoted keys to valid JSON if needed
                json_str = inner.group(1).replace("'", '"')
                # Add quotes to unquoted keys
                json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)\s*:', r'\1"\2":', json_str)
                query = json.loads(json_str)
            except Exception:
                pass
        count = db_manager.count_documents(query)
        return {
            "type": "count",
            "count": count,
            "data": count
        }
        
    # Case: db.wine_samples.aggregate(...)
    if "aggregate" in cmd:
        inner = re.search(r"aggregate\s*\(\s*(\[.*\])\s*\)", cmd, re.DOTALL)
        if inner:
            try:
                json_str = inner.group(1).replace("'", '"')
                json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)\s*:', r'\1"\2":', json_str)
                pipeline = json.loads(json_str)
                res = db_manager.aggregate(pipeline)
                return {
                    "type": "aggregate",
                    "count": len(res),
                    "data": res
                }
            except Exception as e:
                return {"error": f"Failed to parse aggregate pipeline: {str(e)}"}
        # Fallback to default class aggregation if parsing fails
        res = db_manager.aggregate([
            {"$group": {"_id": "$class", "total_samples": {"$sum": 1}}},
            {"$sort": {"total_samples": -1}}
        ])
        return {"type": "aggregate", "count": len(res), "data": res}
        
    # Case: db.wine_samples.find(...)
    if "find" in cmd:
        limit_val = 0
        limit_match = re.search(r"\.limit\s*\(\s*(\d+)\s*\)", cmd)
        if limit_match:
            limit_val = int(limit_match.group(1))
            
        inner = re.search(r"find\s*\(\s*(\{.*?\})\s*(?:,\s*(\{.*?\})\s*)?\)", cmd, re.DOTALL)
        query = {}
        proj = {"_id": 0}
        if inner:
            if inner.group(1):
                try:
                    json_str = inner.group(1).replace("'", '"')
                    json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)\s*:', r'\1"\2":', json_str)
                    query = json.loads(json_str)
                except Exception:
                    pass
            if inner.group(2):
                try:
                    json_str = inner.group(2).replace("'", '"')
                    json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)\s*:', r'\1"\2":', json_str)
                    proj = json.loads(json_str)
                except Exception:
                    pass
                    
        results = db_manager.find(query=query, projection=proj, limit=limit_val)
        return {
            "type": "find",
            "count": len(results),
            "data": results
        }
        
    # Case: Direct JSON query filter
    if cmd.startswith("{") and cmd.endswith("}"):
        try:
            json_str = cmd.replace("'", '"')
            json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)\s*:', r'\1"\2":', json_str)
            query = json.loads(json_str)
            results = db_manager.find(query=query, limit=50)
            return {"type": "find", "count": len(results), "data": results}
        except Exception as e:
            return {"error": f"Invalid JSON filter: {str(e)}"}
            
    return {"error": f"Unsupported or malformed mongosh command. Try: db.wine_samples.find(), db.wine_samples.countDocuments({{}}), or select a preset."}

@app.route("/api/nosql/query", methods=["POST"])
def execute_query():
    data = request.get_json(silent=True) or {}
    command = data.get("command", "").strip()
    preset = data.get("preset", "").strip()
    
    start_time = time.time()
    
    if preset:
        if preset == "count_all":
            command = "db.wine_samples.countDocuments({})"
        elif preset == "limit_5":
            command = "db.wine_samples.find().limit(5)"
        elif preset == "filter_cultivar_1":
            command = 'db.wine_samples.find({ class: "Cultivar_1" })'
        elif preset == "filter_proline_gt_1000":
            command = 'db.wine_samples.find({ proline: { $gt: 1000 } })'
        elif preset == "aggregate_class_counts":
            command = 'db.wine_samples.aggregate([{ $group: { _id: "$class", total_samples: { $sum: 1 } } }, { $sort: { total_samples: -1 } }])'
            
    if not command:
        return jsonify({"error": "No command provided"}), 400
        
    result = parse_and_execute_mongosh(command)
    execution_time = round((time.time() - start_time) * 1000, 2)
    
    result["command"] = command
    result["execution_time_ms"] = execution_time
    result["database"] = DB_NAME
    result["collection"] = COLLECTION_NAME
    result["source"] = "MongoDB Atlas" if db_manager.is_atlas else "Local Hybrid Engine"
    
    return jsonify(result)

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    model_name = data.get("model", "random_forest")
    
    # Extract 13 features
    features = []
    features_dict = {}
    missing = []
    for f in FEATURE_COLS:
        val = data.get(f)
        if val is None or val == "":
            missing.append(f)
        else:
            try:
                f_val = float(val)
                features.append(f_val)
                features_dict[f] = f_val
            except ValueError:
                return jsonify({"error": f"Invalid numeric value for {f}: {val}"}), 400
                
    if missing:
        return jsonify({"error": f"Missing required features: {', '.join(missing)}"}), 400
        
    X_input = pd.DataFrame([features_dict])[FEATURE_COLS]
    
    # Helper to run one model
    def run_inference(m_name):
        model = MODELS.get(m_name)
        if not model:
            return None
        
        if m_name == "logistic_regression" and SCALER is not None:
            X_scaled = SCALER.transform(X_input)
            pred = model.predict(X_scaled)[0]
            probs = model.predict_proba(X_scaled)[0]
        else:
            pred = model.predict(X_input)[0]
            probs = model.predict_proba(X_input)[0]
            
        prob_dict = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probs)}
        confidence = round(float(np.max(probs)) * 100, 2)
        
        return {
            "model": m_name,
            "predicted_class": pred,
            "confidence_percent": confidence,
            "probabilities": prob_dict
        }
        
    if model_name == "all":
        results = {}
        for k in ["random_forest", "logistic_regression", "decision_tree"]:
            results[k] = run_inference(k)
        return jsonify({
            "comparison": results,
            "features_analyzed": features_dict
        })
    else:
        res = run_inference(model_name)
        if not res:
            return jsonify({"error": f"Model '{model_name}' not loaded."}), 400
        res["features_analyzed"] = features_dict
        return jsonify(res)

@app.route("/api/models/metrics", methods=["GET"])
def get_metrics():
    if not METRICS_DATA:
        load_artifacts()
    
    # Include exact report values for reference
    report_reference = {
        "decision_tree": {"accuracy": 0.9556, "precision_macro": 0.9667, "recall_macro": 0.9500, "f1_macro": 0.9565},
        "logistic_regression": {"accuracy": 1.0000, "precision_macro": 1.0000, "recall_macro": 1.0000, "f1_macro": 1.0000},
        "random_forest": {"accuracy": 1.0000, "precision_macro": 1.0000, "recall_macro": 1.0000, "f1_macro": 1.0000},
        "cv_random_forest_5fold": {
            "mean": {"accuracy": 0.9773, "precision": 0.9766, "recall": 0.9802, "f1": 0.9779},
            "std": {"accuracy": 0.0372, "precision": 0.0378, "recall": 0.0327, "f1": 0.0358}
        },
        "class_wise_rf": [
            {"class": "Cultivar_1", "precision": 1.00, "recall": 1.00, "f1": 1.00, "support": 15},
            {"class": "Cultivar_2", "precision": 1.00, "recall": 1.00, "f1": 1.00, "support": 18},
            {"class": "Cultivar_3", "precision": 1.00, "recall": 1.00, "f1": 1.00, "support": 12}
        ],
        "top_feature_importances": [
            {"feature": "flavanoids", "importance": 0.192, "description": "Flavanoid polyphenols"},
            {"feature": "color_intensity", "importance": 0.173, "description": "Optical absorption / color depth"},
            {"feature": "proline", "importance": 0.143, "description": "Amino acid content (mg/L)"}
        ]
    }
    
    return jsonify({
        "metrics": METRICS_DATA,
        "report_reference": report_reference
    })

@app.route("/api/outputs/download/<filename>", methods=["GET"])
def download_output(filename):
    allowed_files = [
        "random_forest_model.pkl", "decision_tree_model.pkl", "logistic_regression_model.pkl",
        "scaler.pkl", "evaluation_metrics.json", "classification_report.csv",
        "confusion_matrix.csv", "test_predictions.csv", "wine_samples.json"
    ]
    if filename not in allowed_files:
        return jsonify({"error": "File not found or access denied"}), 404
        
    return send_from_directory(OUTPUTS_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"Starting Wine Classification Web App on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
