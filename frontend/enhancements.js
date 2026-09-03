/* ZIDIO FORESIGHT: real rolling-origin validation + INR business impact */
(function(){
  "use strict";
  const API="https://foresight-ai-6mlt.onrender.com";
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
  const num=id=>{const e=document.getElementById(id);if(!e)return null;const n=parseFloat(e.textContent.replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:null};
  const money=n=>n==null?"—":"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});

  function decision(){
    const stock=num("stock"), demand=num("demand"), reorder=num("reorderPoint"), order=num("recommendedOrder");
    if(stock==null||reorder==null)return;
    let d="HEALTHY 🟢",r="Inventory is above the reorder point.";
    if(stock<reorder){d="REORDER NOW 🔴";r=`Stock is ${reorder-stock} units below the reorder point. Replenish approximately ${order??"—"} units.`}
    else if(demand!=null&&stock>demand*1.75){d="MARKDOWN / CLEAR 🟠";r="Inventory materially exceeds forecast demand; consider markdown or clearance."}
    else if(demand!=null&&stock<=demand*1.1){d="WATCH / VOLATILE 🟡";r="Inventory is close to projected demand; monitor demand and lead time."}
    set("inventoryDecision",d);set("decisionReason",r);
  }

  async function impact(){
    const sku=(document.getElementById("skuInput")?.value||"SKU001").trim();
    const stock=Number(document.getElementById("stockInput")?.value||0);
    const demand=num("demand");
    const lead=Number(document.getElementById("leadTimeInput")?.value||7);
    const safety=Number(document.getElementById("safetyStockInput")?.value||10);
    if(demand==null||demand<=0)return;
    try{
      const r=await fetch(`${API}/inventory/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku_id:sku,current_stock:stock,predicted_demand:Math.round(demand),lead_time_days:lead,safety_stock:safety})});
      const d=await r.json();
      set("salesRisk",money(d.sales_at_risk));set("overstockCapital",money(d.overstock_capital));
      const a=document.querySelector("#salesRisk + small"),b=document.querySelector("#overstockCapital + small");if(a)a.textContent="Sales at Risk";if(b)b.textContent="Overstock Capital";
      set("inventoryDecision",`${d.decision||"—"}`);set("decisionReason",d.recommendation||"");
    }catch(e){}
  }

  async function validation(){
    try{
      const r=await fetch(`${API}/evaluation/summary`);if(!r.ok)throw new Error();
      const d=await r.json();
      if(!d.available){set("modelPerformance",d.message||"Rolling-origin validation unavailable");return}
      const status=d.beats_baseline?`✓ Beats baseline by ${d.improvement_pct}%`:`✗ Baseline currently stronger`;
      set("modelPerformance",`${d.production_model} · WAPE ${d.production_wape}% vs Seasonal Naive ${d.seasonal_naive_wape}% · ${status}`);
      const p=document.querySelector(".impact-card:first-child p");if(p)p.textContent=`Rolling-origin · ${d.validated_folds} folds · WAPE primary · Bias ${d.production_bias}% · MAPE ${d.production_mape}%`;
    }catch(e){set("modelPerformance","Validation service unavailable");}
  }

  function run(){validation();decision();impact();}
  document.addEventListener("DOMContentLoaded",()=>{setTimeout(run,1800);const b=document.getElementById("generateBtn");if(b)b.addEventListener("click",()=>setTimeout(run,2200));setInterval(run,8000)});
})();
