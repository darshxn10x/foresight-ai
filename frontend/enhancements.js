/* ======================================================
   FORESIGHT AI — ZIDIO REQUIREMENTS UI
   Shows decisions and requests REAL rolling-origin metrics.
   No fabricated WAPE / business numbers.
   ====================================================== */
(function () {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .decision-box{margin-top:18px;padding:16px 18px;border:1px solid #2b3850;border-radius:14px;background:linear-gradient(135deg,rgba(32,46,75,.55),rgba(15,21,34,.8));}
    .decision-box span,.impact-card>span{display:block;color:#6f86ad;font-size:9px;font-weight:800;letter-spacing:1.5px;margin-bottom:8px;}
    .decision-box strong{display:block;color:#fff;font-size:15px;letter-spacing:.3px;margin-bottom:6px;}.decision-box small{color:#8799b7;line-height:1.5;}
    .impact-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0;}.impact-card{padding:20px 22px;border:1px solid #202c42;border-radius:16px;background:#101622;min-height:112px;}
    .impact-card h3{margin:6px 0 8px;color:#eef3ff;font-size:16px;line-height:1.35;}.impact-card p{margin:0;color:#7185a7;font-size:11px;line-height:1.5;}
    .impact-values{display:flex;gap:45px;margin-top:10px;}.impact-values div{display:flex;flex-direction:column;gap:4px;}.impact-values b{font-size:23px;color:#f4f7ff}.impact-values small{color:#7185a7;font-size:10px}
    .validation-note{margin-top:8px;color:#7185a7;font-size:10px;line-height:1.5}.decision-box strong{font-weight:800}
    @media(max-width:760px){.impact-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const API = "https://foresight-ai-6mlt.onrender.com";

  function num(id){const e=document.getElementById(id);if(!e)return null;const n=parseFloat(e.textContent.replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:null;}
  function set(id,text){const e=document.getElementById(id);if(e)e.textContent=text;}

  function updateDecision(){
    const stock=num("stock"), demand=num("demand"), reorder=num("reorderPoint"), order=num("recommendedOrder");
    if(stock===null||reorder===null)return;
    let decision="HEALTHY 🟢", reason="Inventory is above the reorder point. Continue monitoring demand.";
    if(stock<reorder){decision="REORDER NOW 🔴";reason=`Stock is ${reorder-stock} units below the reorder point. Replenish approximately ${order??"—"} units.`;}
    else if(demand!==null&&stock>demand*1.75){decision="MARKDOWN / CLEAR 🟠";reason="Inventory is substantially above forecast demand; consider reducing excess stock.";}
    else if(demand!==null&&stock<demand){decision="WATCH / VOLATILE 🟡";reason="Stock is below forecast demand; continue close monitoring.";}
    set("inventoryDecision",decision);set("decisionReason",reason);
  }

  function updateImpact(){
    const stock=num("stock"), demand=num("demand");
    if(stock===null||demand===null)return;
    set("salesRisk",`${Math.max(0,Math.ceil(demand-stock))} units`);
    set("overstockCapital",`${Math.max(0,Math.ceil(stock-demand))} units`);
  }

  async function loadRollingOrigin(data){
    if(!window.demandData||!Array.isArray(window.demandData))return;
    try{
      const r=await fetch(`${API}/evaluation/rolling-origin`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:window.demandData,horizon_weeks:1})});
      if(!r.ok)throw new Error("evaluation unavailable");
      const result=await r.json();
      const first=result.results&&result.results[0];
      if(!first){set("modelPerformance","No validation result for this dataset");return;}
      if(!first.available){set("modelPerformance",first.message);return;}
      const status=first.beats_baseline?`✓ Beats baseline by ${first.improvement_pct}%`:`✗ Does not beat baseline`;
      set("modelPerformance",`${first.production_model.replace(/_/g," ")} · WAPE ${first.production_wape}% vs Seasonal Naive ${first.seasonal_naive_wape}% · ${status}`);
      const p=document.querySelector(".impact-card p");if(p)p.textContent=`Rolling-origin · ${first.folds} folds · WAPE primary · Bias ${first.production_bias}% · MAPE ${first.production_mape}%`;
    }catch(e){set("modelPerformance","Rolling-origin evaluation unavailable");}
  }

  function hook(){
    updateDecision();updateImpact();
    if(typeof window.getForecast==="function"&&!window.getForecast.__foresightHooked){
      const original=window.getForecast;
      const wrapped=async function(){const data=await original.apply(this,arguments);loadRollingOrigin(data);return data;};
      wrapped.__foresightHooked=true;window.getForecast=wrapped;
    }
  }
  let ticks=0;const timer=setInterval(()=>{hook();if(++ticks>40)clearInterval(timer);},400);
  document.addEventListener("click",()=>setTimeout(()=>{updateDecision();updateImpact();loadRollingOrigin();},250));
})();
