(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShortcutLab=api;})(typeof window==='object'?window:this,function(){
'use strict';
function rng(seed){let a=seed>>>0;return function(){a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function dataset(seed,n,correlation,prefix){const r=rng(seed);return Array.from({length:n},(_,i)=>{const y=i%2,s=y?1:-1,shape=s*(.3+r()*.1),color=(r()<correlation?s:-s);return{id:prefix+'-'+i,x:[shape,color],y};});}
function sigmoid(z){return z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));}
function predict(w,row){return sigmoid(w[0]*row.x[0]+w[1]*row.x[1]+w[2]);}
function loss(w,data){return data.reduce((a,d)=>{const p=Math.max(1e-12,Math.min(1-1e-12,predict(w,d)));return a-d.y*Math.log(p)-(1-d.y)*Math.log(1-p);},0)/data.length;}
function accuracy(w,data){return data.reduce((a,d)=>a+Number((predict(w,d)>=.5?1:0)===d.y),0)/data.length;}
function step(w,data,rate=.4){const g=[0,0,0];for(const d of data){const e=predict(w,d)-d.y;g[0]+=e*d.x[0];g[1]+=e*d.x[1];g[2]+=e;}return w.map((v,i)=>v-rate*(g[i]/data.length+(i<2?.001*v:0)));}
function experiment({seed=20270905,correlation=1,epochs=100}={}){
if(!Number.isInteger(seed)||!Number.isInteger(epochs)||epochs<1||epochs>1000||!Number.isFinite(correlation)||correlation<0||correlation>1)throw Error('invalid experiment settings');
const train=dataset(seed,320,correlation,'train'),test=dataset(seed+991,400,1,'test');
const flipped=test.map(d=>({...d,x:[d.x[0],-d.x[1]]}));
let w=[0,0,0],curve=[{epoch:0,loss:loss(w,train)}];
for(let e=1;e<=epochs;e++){w=step(w,train);curve.push({epoch:e,loss:loss(w,train)});}
return{seed,correlation,epochs,weights:w,curve,train,test,flipped,metrics:{training:accuracy(w,train),sameAppearance:accuracy(w,test),flippedAppearance:accuracy(w,flipped)},disjoint:train.every(d=>!test.some(t=>t.id===d.id)),note:'Synthetic two-feature logistic regression; test pairs differ only in background color. No test data enters training.'};
}
return{rng,dataset,sigmoid,predict,loss,accuracy,step,experiment};
});
