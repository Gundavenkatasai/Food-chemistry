# Intelligent NoSQL Database & Wine Classification Web Application
**Coursework CA2 | CSE 494: Intelligent NoSQL Database**  
- **Submitted by:** Gunda Venkatasai  
- **Registration Number:** 12314012  
- **Section:** K223QR  
- **Faculty:** RICHA [32366]  
- **Institution:** Lovely Professional University  

---

## 📌 Project Overview
This web application is a full-featured, interactive implementation of the academic report **GundaVenkatasaiCA2.pdf**. It integrates a **cloud NoSQL database workflow (MongoDB Atlas & PyMongo)** with a **machine learning classification pipeline (Scikit-learn, Pandas, Joblib)** for three-class Italian wine cultivar classification.

The user interface follows a modern, clean **dark theme** designed with deep charcoal, emerald green, and amber gold accents (strictly **no purple**), optimized for readability and responsive exploratory analysis.

---

## 🚀 Key Features

### 1. 📊 Exploratory Data Analysis & Class Balance (Report Sec. 5.1 & 5.2)
- **178 Total Instances, 13 Chemical Attributes, 0 Missing Values, 0 Duplicates**.
- Interactive class distribution chart:
  - **Cultivar_1:** 59 samples (33.15%)
  - **Cultivar_2:** 71 samples (39.89%)
  - **Cultivar_3:** 48 samples (26.97%)
- Key correlation findings highlighted: strong positive correlation between `total_phenols` and `flavanoids` ($r = 0.86$), and negative correlation between `alcalinity_of_ash` and `flavanoids` ($-0.44$).

### 2. 🍃 Interactive MongoDB NoSQL Console (Report Sec. 5.3 & 6)
- Connects to **MongoDB Atlas** (`WineAnalysisDB.wine_samples`) when configured, with seamless hybrid local fallback so queries execute instantly with real data.
- Replicates all `mongosh` queries from Section 6 with one-click presets:
  1. `countDocuments({})` &rarr; 178 total records
  2. `find().limit(5)` &rarr; inspect first 5 documents
  3. `find({ class: "Cultivar_1" })` &rarr; 59 matched documents
  4. `find({ proline: { $gt: 1000 } })` &rarr; exactly 43 documents
  5. `aggregate([{ $group: { _id: "$class", total_samples: { $sum: 1 } } }, { $sort: { total_samples: -1 } }])`
- Supports custom mongosh and JSON query inputs with execution latency timing in milliseconds.

### 3. 🤖 Live Wine Cultivar Classifier (Report Sec. 5.5 & 7)
- Real-time inference using actual trained models:
  - **Random Forest** (200 trees, balanced class weights, max_depth=5)
  - **Logistic Regression** (StandardScaler scaled features, max_iter=1000)
  - **Decision Tree** (max_depth=5)
  - **Tri-Model Consensus** (run all 3 simultaneously to see agreement and confidence)
- One-click presets to test real samples for Cultivar 1, Cultivar 2, Cultivar 3, or pick random holdout samples.

### 4. 📈 Model Comparison & Evaluation (Report Sec. 7.1 & 7.2)
- Holdout test set comparison (45 samples):
  - **Random Forest:** Accuracy: 1.0000, Macro Precision: 1.0000, Macro Recall: 1.0000, Macro F1: 1.0000
  - **Logistic Regression:** Accuracy: 1.0000, Macro Precision: 1.0000, Macro Recall: 1.0000, Macro F1: 1.0000
  - **Decision Tree:** Accuracy: 0.9556, Macro Precision: 0.9667, Macro Recall: 0.9500, Macro F1: 0.9565
- Stratified 5-Fold Cross-Validation stats for Random Forest:
  - Mean Accuracy: **97.73%** (&plusmn;0.0372 std)
  - Mean Macro F1: **97.79%** (&plusmn;0.0358 std)
- 3&times;3 Confusion Matrix visualization (15/15, 18/18, 12/12 correct predictions).
- Feature Importances ranking: Flavanoids (19.2%), Color Intensity (17.3%), Proline (14.3%).

### 5. 📋 Full Wine Dataset Explorer (178 Records)
- Paginated table showing all 178 samples with real chemical attributes.
- Filter by cultivar or search any numeric parameter.

### 6. 💾 Saved Project Outputs (Report Sec. 8)
Direct download access for all artifacts saved by the notebook:
- `random_forest_model.pkl` (Joblib serialized model)
- `evaluation_metrics.json` (Structured JSON metrics)
- `classification_report.csv`
- `confusion_matrix.csv`
- `test_predictions.csv`
- `wine_samples.json` (Seeding dataset for MongoDB)

---

## 🛠️ Tech Stack
- **Backend:** Python 3.13, Flask 3.1.1
- **Database:** MongoDB Atlas / PyMongo 4.19.0 (with built-in hybrid local engine)
- **Machine Learning:** Scikit-Learn 1.8.0, Pandas 3.1.0, Joblib 1.5.3
- **Frontend:** Responsive HTML5, Vanilla JavaScript, Custom Dark Theme CSS (No frameworks/heavy builds required)
- **Visualizations:** Chart.js 4.4.1

---

## 💻 How to Run

1. **Clone / Open the Directory:**
   ```bash
   cd c:\Users\venka\OneDrive\Desktop\nosql
   ```

2. **(Optional) Configure MongoDB Atlas:**
   Add your Atlas connection string to `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
   *Note: If omitted, the app will automatically use the built-in 178 UCI Wine records in Local Hybrid Mode, so everything functions 100% without external setup.*

3. **Start the Application:**
   Double-click `run.bat` or run:
   ```bash
   py app.py
   ```

4. **Access the Web Dashboard:**
   Open your browser at:
   ```
   http://127.0.0.1:5000
   ```

