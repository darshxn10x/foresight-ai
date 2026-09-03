/* ZIDIO FORESIGHT: dashboard decision, INR impact and validation */
(function(){
  "use strict";
  const API="https://foresight-ai-6mlt.onrender.com";
  const RAW_SKU="https://raw.githubusercontent.com/darshxn10x/foresight-ai/main/data/raw/sku_master.csv";
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
  const num=id=>{const e=document.getElementById(id);if(!e)return null;const n=parseFloat(e.textContent.replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:null};
  const money=n=>n==null?"—":"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});
  const esc=s=>String(s??"").trim().toUpperCase().replace(/\r/g,"");

  function decision(){
    const stock=num("stock"), demand=num("demand"), reorder=num("reorderPoint"), order=num("recommendedOrder");
    if(stock==null||reorder==null)return;
    let d="HEALTHY 🟢",r="Inventory is above the reorder point.";
    if(stock<reorder){d="REORDER NOW 🔴";r=`Stock is ${reorder-stock} units below the reorder point. Replenish approximately ${order??"—"} units.`}
    else if(demand!=null&&stock>demand*1.5){d="MARKDOWN / CLEAR 🟠";r="Inventory materially exceeds forecast demand; consider markdown or clearance."}
    else if(demand!=null&&stock<=demand*1.1){d="WATCH / VOLATILE 🟡";r="Inventory is close to projected demand; monitor demand and lead time."}
    set("inventoryDecision",d);set("decisionReason",r);
  }

  async function pricesFromMaster(sku){
    try{
      const r=await fetch(RAW_SKU+"?v="+Date.now());
      if(!r.ok)throw new Error();
      const rows=(await r.text()).split(/\r?\n/).filter(Boolean);
      const headers=rows.shift().split(",").map(x=>x.trim());
      const si=headers.indexOf("sku_id"), ci=headers.indexOf("unit_cost"), pi=headers.indexOf("list_price");
      for(const line of rows){
        const cols=line.split(",");
        if(esc(cols[si])===esc(sku)) return {unit_cost:Number(cols[ci]),list_price:Number(cols[pi])};
      }
    }catch(e){}
    return null;
  }

  async function impact(){
    const sku=(document.getElementById("skuInput")?.value||"SKU001").trim();
    const stock=Number(document.getElementById("stockInput")?.value||0);
    const demand=num("demand");
    if(demand==null||demand<=0)return;
    let result=null;
    try{
      const r=await fetch(`${API}/inventory/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sku_id:sku,current_stock:stock,predicted_demand:Math.round(demand),lead_time_days:Number(document.getElementById("leadTimeInput")?.value||7),safety_stock:Number(document.getElementById("safetyStockInput")?.value||10)})});
      if(r.ok) result=await r.json();
    }catch(e){}
    if(!result || result.sales_at_risk==null || result.overstock_capital==null){
      const prices=await pricesFromMaster(sku);
      if(prices){
        result=result||{};
        result.sales_at_risk=Math.max(0,demand-stock)*prices.list_price;
        result.overstock_capital=Math.max(0,stock-demand)*prices.unit_cost;
        result.unit_cost=prices.unit_cost; result.list_price=prices.list_price;
      }
    }
    if(result){
      set("salesRisk",money(result.sales_at_risk));
      set("overstockCapital",money(result.overstock_capital));
      const a=document.querySelector("#salesRisk + small"),b=document.querySelector("#overstockCapital + small");
      if(a)a.textContent="Sales at Risk"; if(b)b.textContent="Overstock Capital";
      if(result.decision){set("inventoryDecision",result.decision);set("decisionReason",result.recommendation||"");}
    }
  }

  async function validation(){
    try{
      const r=await fetch(`${API}/evaluation/summary?v=${Date.now()}`);if(!r.ok)throw new Error();
      const d=await r.json();
      if(!d.available)throw new Error(d.message||"Unavailable");
      const status=d.beats_baseline?`✓ Beats Seasonal Naive by ${d.improvement_pct}%`:`✗ Seasonal Naive currently stronger`;
      set("modelPerformance",`${d.production_model} · WAPE ${d.production_wape}% vs Seasonal Naive ${d.seasonal_naive_wape}% · ${status}`);
      const p=document.querySelector(".impact-card:first-child p");if(p)p.textContent=`Rolling-origin · ${d.validated_folds} folds · WAPE primary · Bias ${d.production_bias}% · MAPE ${d.production_mape}%`;
    }catch(e){
      set("modelPerformance","Rolling-origin validation pending backend deployment");
      const p=document.querySelector(".impact-card:first-child p");if(p)p.textContent="Production model + Seasonal Naive · WAPE primary · Bias + MAPE · rolling-origin evaluation";
    }
  }

  function run(){decision();impact();validation();}
  document.addEventListener("DOMContentLoaded",()=>{setTimeout(run,1500);const b=document.getElementById("generateBtn");if(b)b.addEventListener("click",()=>setTimeout(run,1200));setInterval(run,10000)});
})();
