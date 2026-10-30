
/* ---------- Styles ---------- */
const CSS = `
body.gw-open{overflow:hidden}
.gw{--gh:#2F6FE4;position:fixed;inset:0;z-index:95;color:#fff;display:grid;grid-template-rows:minmax(150px,32vh) minmax(0,1fr);background:radial-gradient(120% 80% at 50% 0%,color-mix(in srgb,var(--gh) 55%,#7FD3FF),color-mix(in srgb,var(--gh) 70%,#0B1A4A) 70%);transition:background .6s}
.gw[hidden]{display:none}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw{grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(300px,40%) minmax(0,1fr)} }
.gw[data-view=lesson] .gw-stage,.gw[data-view=challenge] .gw-stage,.gw[data-view=review] .gw-stage,.gw[data-view=crew] .gw-stage{min-height:0}
.gw[data-view=crew]{grid-template-rows:0 minmax(0,1fr)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=crew]{grid-template-rows:minmax(0,1fr);grid-template-columns:0 minmax(0,1fr)} }
.gw-stage{position:relative;min-height:0;overflow:hidden}
.gw-cv{position:absolute;inset:0;width:100%;height:100%}
.gw-say{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top,0px));transform:translate(-50%,-6px) scale(.9);max-width:min(86%,420px);padding:10px 16px;border-radius:18px 18px 18px 6px;background:#fff;color:#0D1530;font:800 15px/1.35 var(--f-round);box-shadow:0 10px 24px -12px rgba(0,0,0,.45);opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.2,1.4,.4,1);pointer-events:none;text-align:center}
.gw-say.on{opacity:1;transform:translate(-50%,0) scale(1)}
.gw-ui{position:relative;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 28px)}
.gw-pad{padding:6px var(--gut-r) 24px var(--gut);max-width:880px;margin:0 auto}
.gw-loading{min-height:60%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:800 16px var(--f-round);opacity:.9;animation:breathe 1.6s ease-in-out infinite}
.gw-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 10px) var(--gut-r) 10px var(--gut);background:linear-gradient(color-mix(in srgb,var(--gh) 55%,#0B1A4A) 70%,transparent)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw-top{padding-top:14px} }
.gw-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px 0 10px;border-radius:999px;background:rgba(255,255,255,.18);font:800 15px var(--f-round)}
.gw-tt{flex:1;min-width:0;display:flex;flex-direction:column}
.gw-tt b{font:900 21px/1.15 var(--f-round)}
.gw-tt small{font:700 13px var(--f-round);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gw-xp{display:flex;align-items:center;gap:6px}
.gw-xp svg{width:40px;height:40px}
.gw-xp .t{fill:none;stroke:rgba(255,255,255,.22);stroke-width:5}
.gw-xp .b{fill:none;stroke:#FFE066;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset .6s}
.gw-xp span{display:flex;flex-direction:column;line-height:1.05}
.gw-xp b{font:900 17px var(--f-round)}
.gw-xp small{font:700 11px var(--f-round);opacity:.85}
@media (max-width:560px){ .gw-xp span{display:none} .gw-back span{display:none} .gw-back{padding:0 12px} }
.gw-h1{font:900 clamp(26px,5vw,36px)/1.1 var(--f-round);margin:6px 0 6px;text-shadow:0 2px 14px rgba(0,0,0,.18)}
.gw-h2{font:900 19px var(--f-round);margin:22px 0 10px;letter-spacing:.01em}
.gw-p{font:700 16px/1.45 var(--f-round);opacity:.9}
.gw-p.small{font-size:14px;margin-top:8px}
.gw-me{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:24px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22)}
.gw-lvl{width:62px;height:62px;flex:none;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFC93C 60%,#E8961A);color:#4A2A00;box-shadow:0 0 0 3px #fff,0 10px 20px -10px rgba(0,0,0,.5)}
.gw-lvl b{font:900 26px/1 var(--f-round)}
.gw-lvl small{font:900 10px var(--f-round);text-transform:uppercase;letter-spacing:.08em}
.gw-me-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.gw-me-t b{font:900 18px var(--f-round)}
.gw-me-t small{font:700 13px/1.35 var(--f-round);opacity:.88}
.gw-need{margin-top:10px;padding:10px 14px;border-radius:16px;background:rgba(255,230,102,.22);font:800 14px var(--f-round);display:flex;gap:8px;align-items:center}
.gw-pick{display:grid;gap:10px}
.gw-lcard{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:22px;background:#fff;color:#0D1530;text-align:left;box-shadow:0 12px 26px -16px rgba(0,0,0,.5);transition:transform .15s;animation:gwIn .4s cubic-bezier(.2,1.2,.4,1) both}
.gw-lcard:active{transform:scale(.98)}
.gw-lcard.main{padding:16px;box-shadow:0 0 0 3px #FFE066,0 16px 30px -14px rgba(0,0,0,.55)}
.lc-ic{width:52px;height:52px;flex:none;border-radius:16px;display:grid;place-items:center;font-size:28px;background:color-mix(in srgb,var(--th) 22%,#fff)}
.gw-lcard.main .lc-ic{width:62px;height:62px;font-size:34px}
.lc-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lc-t small{font:800 12px var(--f-round);color:color-mix(in srgb,var(--th) 70%,#0D1530);text-transform:uppercase;letter-spacing:.06em}
.lc-t b{font:900 18px/1.2 var(--f-round)}
.lc-t em{font:800 12px var(--f-round);font-style:normal;color:#B7791F}
.lc-go{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--th);color:#fff;flex:none}
.gw-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px}
.gw-tile{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);text-align:left;color:#fff}
.gt-ic{width:42px;height:42px;flex:none;border-radius:14px;display:grid;place-items:center;font-size:22px;background:rgba(255,255,255,.2)}
.gw-tile b{display:block;font:900 15px/1.2 var(--f-round)}
.gw-tile small{font:700 12px var(--f-round);opacity:.85}
.gw-const{position:relative;width:100%;max-width:520px;margin:0 auto 24px}
.gw-const svg{position:absolute;inset:0;width:100%;height:100%}
.gw-links line{stroke:rgba(255,255,255,.28);stroke-width:2;stroke-dasharray:4 6}
.gw-links line.hub{stroke:rgba(255,255,255,.14)}
.gw-core{fill:rgba(255,230,102,.2);stroke:rgba(255,230,102,.6);stroke-width:2}
.gw-core-l{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
.gw-core-l b{font:900 30px/1 var(--f-round);color:#FFE066}
.gw-core-l small{font:900 11px var(--f-round);text-transform:uppercase;letter-spacing:.08em;opacity:.85}
.gw-star{position:absolute;width:min(19%,96px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--th) 45%,#fff),var(--th));box-shadow:0 10px 22px -10px rgba(0,0,0,.6),inset 0 -6px 10px rgba(0,0,0,.18);transition:transform .2s}
.gw-star:active{transform:translate(-50%,-50%) scale(.94)}
.gw-star.open{animation:starPulse 2.4s ease-in-out infinite}
@keyframes starPulse{50%{box-shadow:0 0 0 8px color-mix(in srgb,var(--th) 30%,transparent),0 10px 22px -10px rgba(0,0,0,.6)}}
.gw-star svg{position:absolute;inset:-12%;width:124%;height:124%}
.gw-star .t{fill:none;stroke:rgba(255,255,255,.25);stroke-width:5}
.gw-star .b{fill:none;stroke:#FFE066;stroke-width:5;stroke-linecap:round}
.gs-ic{font-size:clamp(20px,4.6vw,34px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.gs-n{position:absolute;top:104%;left:50%;transform:translateX(-50%);width:max-content;max-width:120px;text-align:center;font:900 12px/1.15 var(--f-round);text-shadow:0 1px 6px rgba(0,0,0,.4)}
.gs-n small{display:block;font:800 11px var(--f-round);opacity:.85}
.gw-cases{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.gw-case{flex:none;width:130px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px;border-radius:18px;background:#fff;color:#0D1530;text-align:left;box-shadow:inset 0 -4px 0 var(--th)}
.gw-case span{font-size:28px}
.gw-case b{font:900 14px/1.2 var(--f-round)}
.gw-case small{font:700 11px var(--f-round);color:#5A6380}
.gw-case.done{opacity:.7}
.gw-guides{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:16px}
.gw-guide{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 14px;border-radius:24px;background:#fff;color:#0D1530;text-align:center;box-shadow:0 14px 28px -16px rgba(0,0,0,.5)}
.gg-e{font-size:54px;animation:gwBob 3s ease-in-out infinite}
.gw-guide b{font:900 18px var(--f-round)}
.gw-guide small{font:700 13px/1.35 var(--f-round);color:#5A6380}
@keyframes gwBob{50%{transform:translateY(-5px) rotate(-4deg)}}
@keyframes gwIn{from{opacity:0;transform:translateY(12px) scale(.97)}}
.gw-path{display:flex;flex-direction:column;gap:16px}
.gw-unit{padding:14px;border-radius:24px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)}
.gw-unit header{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}
.gu-n{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.08em;color:#FFE066}
.gw-unit header b{font:900 20px var(--f-round)}
.gw-unit header small{font:700 14px/1.35 var(--f-round);opacity:.85}
.gw-unit.soon{opacity:.6}
.gw-soon{display:flex;align-items:center;gap:8px;font:800 14px var(--f-round);opacity:.85}
.gw-nodes{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative}
.gw-node{position:relative;display:flex;align-items:center;gap:12px;width:min(100%,380px);padding:8px 14px 8px 8px;border-radius:999px;background:rgba(255,255,255,.12);text-align:left;color:#fff;transition:transform .15s}
.gw-node.s-r{transform:translateX(18%)}
.gw-node.s-l{transform:translateX(-18%)}
@media (max-width:560px){ .gw-node.s-r{transform:translateX(8%)} .gw-node.s-l{transform:translateX(-8%)} }
.gn-ic{width:52px;height:52px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:26px;background:rgba(255,255,255,.2);box-shadow:inset 0 -5px 0 rgba(0,0,0,.15)}
.gn-t{font:900 15px/1.2 var(--f-round)}
.gw-node.open{background:#fff;color:#0D1530}
.gw-node.open .gn-ic{background:var(--gh);box-shadow:inset 0 -5px 0 rgba(0,0,0,.18)}
.gw-node.next{box-shadow:0 0 0 3px #FFE066;animation:nodeHop 1.8s ease-in-out infinite}
@keyframes nodeHop{50%{translate:0 -4px}}
.gw-node.done .gn-ic{background:#fff}
.gw-node.done.gold .gn-ic{background:radial-gradient(circle,#FFF3B0,#FFC93C)}
.gw-node.locked{opacity:.55}
.gw-node.boss .gn-ic{border-radius:18px}
.gw-node.story .gn-ic{border-radius:14px;background:rgba(255,255,255,.3)}
.gw-run-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 10px) var(--gut-r) 10px var(--gut)}
.gw-x{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.18)}
.gw-prog{flex:1;height:12px;border-radius:6px;background:rgba(0,0,0,.2);overflow:hidden}
.gw-prog i{display:block;height:100%;border-radius:6px;background:linear-gradient(180deg,#FFF3B0 0 45%,#FFC93C 45%);transition:width .4s cubic-bezier(.2,.9,.3,1)}
.gw-beat{font:900 13px var(--f-round);text-transform:uppercase;letter-spacing:.08em;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.2)}
.gw-team{flex:1;font:900 18px var(--f-round);text-align:center}
.gw-runpad{padding-top:0}
.gw-ltitle{font:900 14px var(--f-round);opacity:.9;margin-bottom:8px}
.gw-card{position:relative;padding:18px;border-radius:26px;background:#fff;color:#0D1530;box-shadow:0 20px 40px -24px rgba(0,0,0,.55);animation:gwIn .35s cubic-bezier(.2,1.2,.4,1) both}
.gw-card.hook,.gw-card.home{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
.gw-card h2{font:900 24px/1.2 var(--f-round)}
.gw-card h3{font:900 18px var(--f-round);color:color-mix(in srgb,var(--gh) 70%,#0D1530);margin-bottom:6px}
.gw-card p{font:700 18px/1.5 var(--f-round)}
.gw-card.learn p+p{margin-top:8px}
.gw-card .g-go{margin-top:14px}
.gw-big{font-size:64px;line-height:1;animation:gwBob 3s ease-in-out infinite}
.gw-ex{padding:12px 14px;border-radius:16px;background:color-mix(in srgb,var(--gh) 10%,#fff);border:2px dashed color-mix(in srgb,var(--gh) 40%,#fff)}
.gw-ex b{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:color-mix(in srgb,var(--gh) 70%,#0D1530)}
.gw-ex p{font-size:16px!important}
.gw-yt{font:900 15px var(--f-round)!important;margin:12px 0 4px}
.gw-p2{font:800 17px/1.45 var(--f-round);margin-bottom:12px}
.gw-fb:empty{display:none}
.gw-fb{margin-top:14px;display:flex;flex-direction:column;gap:10px;animation:gwIn .3s both}
.gw-fbin{padding:12px 14px;border-radius:16px;font:700 15px/1.4 var(--f-round);display:flex;flex-direction:column;gap:2px}
.gw-fbin b{font:900 17px var(--f-round)}
.gw-fbin.good{background:#E3F9EA;color:#14532D}
.gw-fbin.bad{background:#FFF1E6;color:#7A3B00}
.gw-done{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:12px}
.gw-stars{display:flex;align-items:flex-end;gap:8px;margin-top:8px}
.gw-star3{position:relative;width:76px;height:76px}
.gw-star3:nth-child(2){width:96px;height:96px;transform:translateY(-10px)}
.gw-star3 svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gw-star3 .rs-sock path{fill:rgba(0,0,0,.22);stroke:rgba(255,255,255,.55);stroke-width:6;stroke-linejoin:round}
.gw-star3 .rs-gold{opacity:0}
.gw-star3 .rs-gold .rs-body{stroke:#2B2238;stroke-width:10;stroke-linejoin:round;paint-order:stroke}
.gw-star3.on .rs-gold{animation:gwSlam .65s var(--d) cubic-bezier(.3,.7,.4,1) both}
@keyframes gwSlam{0%{opacity:0;transform:scale(2.4) rotate(-120deg)}42%{opacity:1;transform:scale(1) rotate(0)}60%{transform:scale(1.18)}80%{transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
.gw-xpwin{display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:10px 20px;border-radius:20px;background:rgba(255,230,102,.25);font:900 22px var(--f-round)}
.gw-xpwin.none{display:none}
.gw-xpwin small{font:700 13px var(--f-round);opacity:.9}
.gw-banner{padding:10px 16px;border-radius:16px;background:rgba(255,255,255,.2);font:900 16px var(--f-round);animation:gwIn .4s .3s both}
.gw-homecard{width:min(100%,460px);padding:14px 16px;border-radius:20px;background:#fff;color:#0D1530;text-align:left}
.gw-homecard b{font:900 13px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:#B7791F}
.gw-homecard p{font:700 16px/1.45 var(--f-round);margin:4px 0 6px}
.gw-actions{display:flex;flex-direction:column;gap:10px;width:min(100%,460px);margin-top:8px}
.gw-crewkids{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:8px 0 16px}
.gw-ck{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px;border-radius:20px;background:rgba(255,255,255,.14);border:2px solid transparent}
.gw-ck span{font-size:40px}
.gw-ck b{font:900 16px var(--f-round)}
.gw-ck small{font:700 12px var(--f-round);opacity:.85}
.gw-ck.on{background:#fff;color:#0D1530;border-color:var(--kh)}
.gw-crew{display:grid;gap:10px;padding:0 10px 10px;height:calc(100% - 70px)}
.gw-crew.n2{grid-template-columns:1fr 1fr}.gw-crew.n3{grid-template-columns:repeat(3,1fr)}.gw-crew.n4{grid-template-columns:1fr 1fr}
@media (max-width:700px){ .gw-crew.n2,.gw-crew.n3,.gw-crew.n4{grid-template-columns:1fr} }
.gw-pane{min-height:0;overflow:auto;padding:12px;border-radius:24px;background:linear-gradient(160deg,color-mix(in srgb,var(--kh) 40%,#fff 0%),color-mix(in srgb,var(--kh) 85%,#0B1A4A));}
.gw-pane header{display:flex;justify-content:space-between;align-items:center;font:900 17px var(--f-round);margin-bottom:6px}
.gw-pane header b{font:900 26px var(--f-round)}
.gw-pane .gw-host{background:#fff;color:#0D1530;border-radius:20px;padding:12px}
.cg-card{overflow:hidden}
.cg-main{display:flex;align-items:center;gap:14px;width:100%;text-align:left;color:inherit;padding:2px 0}
.cg-orbit{position:relative;width:86px;height:86px;flex:none;border-radius:50%;background:radial-gradient(circle,rgba(255,230,102,.32),rgba(255,255,255,.06) 70%);display:grid;place-items:center}
.cg-orbit i{position:absolute;width:13px;height:13px;margin:-6.5px;border-radius:50%;background:color-mix(in srgb,var(--th) calc(35% + var(--p) * 65%),rgba(255,255,255,.25));box-shadow:0 0 calc(var(--p) * 10px) var(--th)}
.cg-orbit b{font:900 26px var(--f-round);color:#FFE066;text-shadow:0 1px 8px rgba(0,0,0,.25)}
.cg-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.cg-txt small{font:800 12px var(--f-round);color:var(--on-sky-2);text-transform:uppercase;letter-spacing:.05em}
.cg-txt b{font:900 19px/1.2 var(--f-round)}
.cg-bar{display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.2);overflow:hidden;margin-top:2px}
.cg-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#FFE066,#FFB020)}
.cg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cg-chips button{min-height:34px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.2);font:800 13px var(--f-round)}
.cg-moment{display:flex;align-items:center;gap:12px;width:100%;margin:2px 0 12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.18);text-align:left}
.cg-moment>span:first-child{font-size:26px}
.cg-moment small{display:block;font:800 12px var(--f-round);color:var(--on-sky-2);text-transform:uppercase;letter-spacing:.05em}
.cg-moment b{font:800 15px/1.35 var(--f-round)}
.cg-moment.done{opacity:.75}
.cg-door{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.18);text-align:left}
.cg-door>span:first-child{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:var(--th)}
.cg-door>span:nth-child(2){flex:1;min-width:0}
.cg-door b{display:block;font:900 16px var(--f-round)}
.cg-door small{font:700 13px var(--f-round);color:var(--on-sky-2)}
.pg-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:12px 0 4px}
.pg-stat{padding:14px;border-radius:18px;background:var(--cell)}
.pg-stat b{display:block;font:800 28px/1.1 var(--f-round)}
.pg-stat span{font:500 13px var(--f-text);color:var(--ink-2)}
.pg-stat.hl{background:linear-gradient(135deg,#7C5CFF,#C084FC);color:#fff}
.pg-stat.hl span{color:rgba(255,255,255,.9)}
.pg-ti{width:36px;height:36px;flex:none;border-radius:10px;display:grid;place-items:center;font-size:19px;background:color-mix(in srgb,var(--th) 22%,var(--cell))}
.pg-map .row-main{flex:0 1 220px}
.pg-units{flex:1 1 220px;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.pg-u{display:inline-flex;gap:2px;padding:3px 5px;border-radius:8px;background:var(--fill)}
.pg-dot{width:10px;height:10px;border-radius:50%;background:var(--fill-2)}
.pg-dot.tried{background:#F5A623}
.pg-dot.bronze{background:#C98A3E}
.pg-dot.silver{background:#9AA3B5}
.pg-dot.gold{background:#FFC93C;box-shadow:0 0 0 2px rgba(255,201,60,.35)}
.pg-dot.soon{background:transparent;border:1px dashed var(--fill-2)}
.pg-two{display:grid;grid-template-columns:minmax(0,1fr);gap:0 16px}
@media (min-width:1000px){ .pg-two{grid-template-columns:repeat(2,minmax(0,1fr))} }
/* mini-games */
.g-qrow{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px}
.g-q{flex:1;font:900 21px/1.3 var(--f-round)}
.g-say{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--gh) 14%,#fff);color:color-mix(in srgb,var(--gh) 75%,#0D1530)}
.g-sub{font:800 15px var(--f-round);color:#5A6380;margin:-4px 0 10px}
.g-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:54px;width:100%;padding:0 22px;border-radius:18px;background:var(--gh);color:#fff;font:900 18px var(--f-round);box-shadow:0 6px 0 color-mix(in srgb,var(--gh) 70%,#000),0 14px 24px -14px rgba(0,0,0,.5);transition:transform .1s,box-shadow .1s}
.gw .g-go{background:var(--gh)}
.gw-done .g-go,.gw-pad>.g-go{background:#fff;color:#0D1530;box-shadow:0 6px 0 rgba(0,0,0,.18)}
.g-go:active{transform:translateY(4px);box-shadow:0 2px 0 color-mix(in srgb,var(--gh) 70%,#000)}
.g-go:disabled{opacity:.45}
.g-go.ghost{background:transparent!important;color:inherit!important;box-shadow:inset 0 0 0 2px currentColor!important}
.gw-card .g-go.ghost{color:color-mix(in srgb,var(--gh) 70%,#0D1530)!important}
.g-go.big{min-height:70px;font-size:22px}
.g-note{font:700 17px/1.5 var(--f-round);margin-bottom:12px}
.g-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;perspective:900px}
.g-cards.n3,.g-cards.col{grid-template-columns:minmax(0,1fr)}
.g-card{min-height:64px;padding:12px 16px;border-radius:18px;background:#F2F4FA;color:#0D1530;font:800 17px/1.3 var(--f-round);text-align:left;box-shadow:inset 0 -4px 0 rgba(13,21,48,.08);animation:cardIn .45s var(--d,0ms) cubic-bezier(.2,1.2,.4,1) both;transform-origin:50% 100%;transition:background .2s,box-shadow .2s,transform .15s}
@keyframes cardIn{from{opacity:0;transform:rotateX(-70deg) translateY(10px)}}
.g-card:active{transform:scale(.97)}
.g-card.right{background:#DDF8E6;box-shadow:inset 0 0 0 3px #30C25A;animation:cardFlip .5s both}
.g-card.wrong{background:#FFE9E3;box-shadow:inset 0 0 0 3px #FF8A65}
.g-card.debate span{font-style:italic}
.g-card:disabled{cursor:default}
@keyframes cardFlip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg) scale(1.04)}100%{transform:rotateY(0)}}
.g-wobble{animation:gWob .45s ease-in-out}
@keyframes gWob{20%,60%{transform:translateX(-7px) rotate(-1deg)}40%,80%{transform:translateX(7px) rotate(1deg)}}
.g-swipe{display:grid;place-items:center;padding:8px 0 4px}
.g-swcard{position:relative;width:min(100%,380px);min-height:170px;padding:24px 22px;border-radius:24px;background:linear-gradient(160deg,#fff,#F2F4FA);color:#0D1530;font:900 21px/1.35 var(--f-round);display:grid;place-items:center;text-align:center;box-shadow:0 14px 30px -16px rgba(0,0,0,.45),inset 0 0 0 2px rgba(13,21,48,.06);touch-action:pan-y;cursor:grab;user-select:none}
.g-sw-l,.g-sw-r{position:absolute;top:12px;font:900 13px var(--f-round);font-style:normal;padding:4px 10px;border-radius:999px;opacity:0;transition:opacity .15s}
.g-sw-l{left:12px;background:#FFE9E3;color:#B33A1C}
.g-sw-r{right:12px;background:#DDF8E6;color:#1B7A3A}
.g-swcard[data-lean=l] .g-sw-l,.g-swcard[data-lean=r] .g-sw-r{opacity:1}
.g-tfrow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.g-tf{min-height:56px;border-radius:18px;font:900 18px var(--f-round);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.g-tf.no{background:#FFE9E3;color:#B33A1C}
.g-tf.yes{background:#DDF8E6;color:#1B7A3A}
.g-tf.right{box-shadow:0 0 0 3px #30C25A}
.g-tf.wrong{box-shadow:0 0 0 3px #FF8A65}
.g-hint{font:700 13px var(--f-round);color:#5A6380;text-align:center;margin-top:8px}
.g-blank{display:inline-block;min-width:60px;padding:0 10px;margin:0 4px;border-radius:10px;background:color-mix(in srgb,var(--gh) 14%,#fff);border-bottom:3px solid var(--gh);text-align:center}
.g-blank.right{background:#DDF8E6;border-color:#30C25A}
.g-blank.wrong{background:#FFE9E3;border-color:#FF8A65}
.g-chips{display:flex;flex-wrap:wrap;gap:8px}
.g-chip{min-height:46px;padding:0 16px;border-radius:14px;background:#F2F4FA;color:#0D1530;font:800 16px var(--f-round);box-shadow:inset 0 -3px 0 rgba(13,21,48,.08);transition:transform .15s,opacity .2s}
.g-chip.sel{background:var(--gh);color:#fff;transform:translateY(-3px)}
.g-chip.gone{opacity:0;pointer-events:none;width:0;padding:0;margin:0 -4px}
.g-chip.right{background:#DDF8E6}
.g-chip.wrong{background:#FFE9E3}
.g-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:320px;margin:4px auto 10px}
.g-pad button{min-height:56px;border-radius:16px;background:#F2F4FA;font:900 22px var(--f-round);color:#0D1530;box-shadow:inset 0 -4px 0 rgba(13,21,48,.08)}
.g-pad button:active{transform:translateY(2px)}
.g-input{width:100%;min-height:54px;padding:0 16px;margin-bottom:10px;border-radius:16px;border:2px solid #E1E5F0;font:800 18px var(--f-round);-webkit-user-select:text;user-select:text}
.g-tray{display:flex;flex-wrap:wrap;gap:8px;min-height:50px;margin-bottom:12px}
.g-bins{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.g-bins.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g-bins.n4{grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:640px){ .g-bins.n4{grid-template-columns:repeat(4,minmax(0,1fr))} }
.g-bin{min-height:110px;padding:10px;border-radius:20px;background:color-mix(in srgb,var(--bc) 18%,#fff);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--bc) 50%,#fff);display:flex;flex-direction:column;align-items:center;gap:6px;color:#0D1530}
.g-bins.jars .g-bin{border-radius:20px 20px 28px 28px;background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--bc) 25%,#fff))}
.g-bin b{font:900 15px var(--f-round)}
.g-binin{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.g-mini{padding:4px 8px;border-radius:10px;background:#fff;font:800 12px var(--f-round);box-shadow:0 2px 6px -2px rgba(0,0,0,.2)}
.g-mini.right{background:#DDF8E6}.g-mini.wrong{background:#FFE9E3}
.g-land{animation:gLand .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes gLand{50%{transform:scale(1.06)}}
.g-line{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}
.g-line li{display:flex;align-items:center;gap:10px;min-height:46px;padding:6px 12px 6px 6px;border-radius:14px;background:#F2F4FA;font:800 15px var(--f-round);border:2px dashed #D5DBEA}
.g-line li.on{border-style:solid;border-color:transparent;background:color-mix(in srgb,var(--gh) 12%,#fff);animation:gwIn .25s both}
.g-line li.right{background:#DDF8E6}.g-line li.wrong{background:#FFE9E3}
.g-line.stack{flex-direction:column-reverse}
.g-n{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;background:#fff;font:900 14px var(--f-round)}
.g-match{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g-match.map{padding:10px;border-radius:20px;background:repeating-linear-gradient(45deg,#E9F6FF 0 12px,#E1F1FF 12px 24px)}
.g-col{display:flex;flex-direction:column;gap:8px}
.g-m{min-height:50px;padding:8px 12px;border-radius:14px;background:#F2F4FA;color:#0D1530;font:800 15px/1.25 var(--f-round);text-align:left;box-shadow:inset 6px 0 0 var(--mc,transparent)}
.g-m.sel{background:color-mix(in srgb,var(--gh) 16%,#fff);box-shadow:inset 0 0 0 2px var(--gh)}
.g-m.right{background:#DDF8E6}.g-m.wrong{background:#FFE9E3}
.g-slider{position:relative;padding:8px 4px 4px}
.g-out{display:block;text-align:center;font:900 34px var(--f-round);color:color-mix(in srgb,var(--gh) 80%,#0D1530);margin-bottom:6px}
.g-slider input{width:100%;accent-color:var(--gh);height:36px}
.g-ends{display:flex;justify-content:space-between;font:800 12px var(--f-round);color:#5A6380}
.g-target{position:absolute;bottom:22px;width:4px;height:30px;margin-left:-2px;border-radius:2px;background:#30C25A;box-shadow:0 0 0 3px rgba(48,194,90,.25)}
.g-slider+.g-go{margin-top:12px}
.g-shelf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.g-prod{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 12px 14px;border-radius:20px;background:#F7F4EC;color:#0D1530;box-shadow:inset 0 -6px 0 #E8DFCB}
.g-tag{position:absolute;top:-8px;right:10px;padding:4px 10px;border-radius:8px;background:#FFD43B;font:900 15px var(--f-round);transform:rotate(4deg);box-shadow:0 4px 8px -4px rgba(0,0,0,.3)}
.g-prod b{font:900 17px var(--f-round);margin-top:6px}
.g-prod small{font:700 13px var(--f-round);color:#5A6380}
.g-per{font:800 13px var(--f-round);font-style:normal;color:#14532D;opacity:0;transition:opacity .3s}
.reveal .g-per{opacity:1}
.g-prod.right{box-shadow:0 0 0 3px #30C25A,inset 0 -6px 0 #E8DFCB}.g-prod.wrong{box-shadow:0 0 0 3px #FF8A65,inset 0 -6px 0 #E8DFCB}
.g-phone{width:min(100%,360px);margin:0 auto;padding:14px;border-radius:30px;background:#1B2033;box-shadow:inset 0 0 0 6px #2A3150}
.g-ph-top{font:800 12px var(--f-round);color:#9AA3B5;text-align:center;margin-bottom:10px}
.g-bubble{position:relative;padding:14px;border-radius:18px 18px 18px 6px;background:#fff;color:#0D1530;font:700 16px/1.4 var(--f-text);animation:gwIn .3s both}
.g-verdict{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font:900 12px var(--f-round);font-style:normal}
.g-verdict.bad{background:#FFE9E3;color:#B33A1C}.g-verdict.good{background:#DDF8E6;color:#1B7A3A}
.g-story{padding:14px;border-radius:18px;background:color-mix(in srgb,var(--gh) 10%,#fff);font:700 17px/1.5 var(--f-round);margin-bottom:12px}
.g-outcome{margin-top:12px;padding:12px 14px;border-radius:16px;font:700 15px/1.45 var(--f-round);animation:gwIn .3s both}
.g-outcome.good{background:#DDF8E6;color:#14532D}.g-outcome.ok{background:#EEF2FF;color:#23306B}.g-outcome.bad{background:#FFF1E6;color:#7A3B00}
.g-room{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px;border-radius:24px;background:linear-gradient(180deg,#FFF8E8 0 55%,#E9D9BC 55%);transform:perspective(700px) rotateX(14deg);transform-origin:50% 100%}
.g-thing{aspect-ratio:1;border-radius:18px;background:rgba(255,255,255,.75);font-size:clamp(28px,7vw,44px);display:grid;place-items:center;box-shadow:0 6px 12px -8px rgba(0,0,0,.4);animation:cardIn .4s var(--d) both;transition:transform .15s}
.g-thing.on{box-shadow:0 0 0 4px var(--gh);transform:scale(1.06)}
.g-thing.right{box-shadow:0 0 0 4px #30C25A}.g-thing.wrong{box-shadow:0 0 0 4px #FF8A65}.g-thing.missed{box-shadow:0 0 0 4px #FFC93C;animation:gWob .5s}
.g-room+.g-hint{margin:12px 0}
.g-budget{display:flex;flex-direction:column;gap:8px}
.g-inc{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 10px;align-items:baseline;padding:10px 14px;border-radius:16px;background:color-mix(in srgb,var(--gh) 10%,#fff);font:800 13px var(--f-round);color:#5A6380}
.g-inc b{font:900 20px var(--f-round);color:#0D1530}.g-inc b.neg{color:#C2410C}
.g-brow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 4px;border-bottom:1px solid #EEF0F6;font:800 15px var(--f-round)}
.g-brow small{display:block;font:700 12px var(--f-round);color:#5A6380}
.g-step{display:flex;align-items:center;gap:8px}
.g-step button{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#F2F4FA;color:#0D1530}
.g-step b{min-width:64px;text-align:center;font:900 17px var(--f-round)}
.g-step.big b{font-size:28px;min-width:90px}
.g-bar{display:block;height:10px;border-radius:5px;background:#EEF0F6;overflow:hidden;margin:6px 0 4px}
.g-bar i{display:block;height:100%;background:var(--gh);transition:width .3s}
.g-chart{position:relative;padding:10px;border-radius:20px;background:#0F1730}
.g-chart svg{width:100%;height:auto;display:block}
.g-ln{fill:none;stroke:#7CF5B5;stroke-width:3;stroke-linejoin:round;stroke-linecap:round}
.g-dot{fill:#FFE066;stroke:#0F1730;stroke-width:2}
.g-yr{position:absolute;left:16px;top:12px;font:800 14px var(--f-round);color:#fff}
.g-mbtn{margin-top:12px}
.g-alert{font:900 16px/1.4 var(--f-round);color:#B33A1C;margin-bottom:6px}
.g-snow{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;border-radius:20px;background:linear-gradient(180deg,#EAF6FF,#fff);margin-bottom:12px}
.g-ball{font-size:46px;transition:transform .25s cubic-bezier(.2,1.4,.4,1)}
.g-snowtxt{font:800 15px var(--f-round)}
.g-snow input{width:100%;accent-color:var(--gh)}
.g-stall{position:relative;border-radius:20px;overflow:hidden;background:#FFF8E8;padding:44px 14px 14px;margin-bottom:10px}
.g-awning{position:absolute;left:0;right:0;top:0;height:30px;background:repeating-linear-gradient(90deg,#E8473C 0 30px,#fff 30px 60px);border-radius:0 0 50% 50% / 0 0 30% 30%}
.g-st-in{display:flex;flex-direction:column;align-items:center;gap:6px}
.g-st-item{font:900 22px var(--f-round)}
.g-st-in small{font:700 13px var(--f-round);color:#5A6380}
.g-crowd{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;min-height:34px;margin-top:8px;font-size:24px}
.g-crowd span{animation:walkIn .4s var(--d) both}
@keyframes walkIn{from{opacity:0;transform:translateX(-30px)}}
.g-timing{position:relative;height:56px;border-radius:28px;background:#EEF0F6;margin:6px 0 14px;overflow:hidden}
.g-zone{position:absolute;left:62%;width:18%;top:0;bottom:0;background:#DDF8E6;border-left:2px dashed #30C25A;border-right:2px dashed #30C25A;display:grid;place-items:center;font:900 12px var(--f-round);color:#1B7A3A;font-style:normal}
.g-mark{position:absolute;top:8px;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:#FFD43B;box-shadow:0 4px 10px -4px rgba(0,0,0,.4)}
.g-docs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
@media (max-width:560px){ .g-docs{grid-template-columns:1fr} }
.g-doc{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:16px;background:#F7F4EC;font:700 14px/1.4 var(--f-text)}
.g-doc>b{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:#5A6380}
.g-doc p,.g-doc button{padding:6px 8px;border-radius:10px;background:#fff;text-align:left;font:700 14px/1.4 var(--f-text);color:#0D1530}
.g-doc button.on{box-shadow:inset 0 0 0 2px var(--gh)}
.g-doc button.right{background:#DDF8E6}.g-doc button.wrong{background:#FFE9E3}.g-doc button.missed{background:#FFF4CC}
.g-chat{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto;padding:10px;border-radius:18px;background:#F2F4FA;margin-bottom:10px}
.g-chat p{max-width:82%;padding:10px 12px;border-radius:16px;font:700 15px/1.4 var(--f-text);animation:gwIn .25s both}
.g-chat .them{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}
.g-chat .me{align-self:flex-end;background:var(--gh);color:#fff;border-bottom-right-radius:4px}
.g-chat .me.meh{background:#9AA3B5}
.g-replies{display:flex;flex-direction:column;gap:8px}
.g-replies .g-chip{text-align:left;padding:10px 14px;height:auto}
.g-box{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.g-box p{padding:10px 12px;border-radius:14px;background:#F2F4FA;font:700 15px/1.4 var(--f-round);color:#9AA3B5}
.g-box p.on{background:color-mix(in srgb,var(--gh) 12%,#fff);color:#0D1530;animation:gwIn .3s both}
.g-box b{color:color-mix(in srgb,var(--gh) 75%,#0D1530);margin-right:4px}
.g-mystery+.g-go{margin-top:10px}
.g-count{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.08em;color:#5A6380;margin-bottom:6px}
.gw-pane .g-count{color:rgba(255,255,255,.85)}
@media (prefers-reduced-motion:reduce){ .gw *{animation:none!important;transition:none!important} }
`;
const style = document.createElement('style'); style.id = 'growth-css'; style.textContent = CSS; document.head.appendChild(style);
