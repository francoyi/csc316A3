# 📊 CSC316 Assignment 3  
## Small Interruptions, Big Costs  
*A data visualization prototype exploring cumulative attention loss*

---

## 📌 Project Overview

This project investigates how **small, frequent interruptions** accumulate into significant attention loss over time.

While individual distractions (e.g., checking a notification) appear insignificant, their repeated occurrence leads to **substantial cumulative impact**.

---

## 🎯 Objective

- Explore patterns of high-frequency, low-duration interruptions  
- Reveal how interruptions accumulate into large total time loss  
- Provide an interactive interface for analyzing distraction types  

---

## 📊 Visualization

### Bubble Chart (Main View)

- Each **bubble** represents a type of interruption  
- **Size** → total accumulated time lost  
- **Color** → category of interruption  
- Data is aggregated to reduce clutter and highlight patterns  

---

## 🖱️ Interaction

- **Hover** → shows detailed info (type, frequency, time)  
- **Click / Filter** → focus on specific categories  
- **View Modes** →  
  - Aggregated view  
  - Detailed view  

---

## 📂 Data

Location:

Files:
- `interruptions.json` — raw interruption events  
- `interruptions_summary.json` — aggregated data  

---

## ▶️ Run Locally

Start server:

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000/`
