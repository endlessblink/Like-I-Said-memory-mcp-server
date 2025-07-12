import{j as c}from"./jsx-runtime-e7d94ccb.js";import{r as o,R as K}from"./index-981f9478.js";import{c as Ft,a as nt,u as Lt,b as at,d as ot,e as qt,P as H,f as L,g as it,h as Dt,i as Ee,B as kt}from"./index-9c4d4ec9.js";import"./index-8b60b3a5.js";function Vt(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function Te(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable})),r.push.apply(r,n)}return r}function Me(e){for(var t=1;t<arguments.length;t++){var r=arguments[t]!=null?arguments[t]:{};t%2?Te(Object(r),!0).forEach(function(n){Vt(e,n,r[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):Te(Object(r)).forEach(function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(r,n))})}return e}function Gt(e,t){if(e==null)return{};var r={},n=Object.keys(e),a,i;for(i=0;i<n.length;i++)a=n[i],!(t.indexOf(a)>=0)&&(r[a]=e[a]);return r}function $t(e,t){if(e==null)return{};var r=Gt(e,t),n,a;if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)n=i[a],!(t.indexOf(n)>=0)&&Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}function Wt(e,t){return zt(e)||Ut(e,t)||Kt(e,t)||Bt()}function zt(e){if(Array.isArray(e))return e}function Ut(e,t){if(!(typeof Symbol>"u"||!(Symbol.iterator in Object(e)))){var r=[],n=!0,a=!1,i=void 0;try{for(var s=e[Symbol.iterator](),f;!(n=(f=s.next()).done)&&(r.push(f.value),!(t&&r.length===t));n=!0);}catch(l){a=!0,i=l}finally{try{!n&&s.return!=null&&s.return()}finally{if(a)throw i}}return r}}function Kt(e,t){if(e){if(typeof e=="string")return Ie(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if(r==="Object"&&e.constructor&&(r=e.constructor.name),r==="Map"||r==="Set")return Array.from(e);if(r==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return Ie(e,t)}}function Ie(e,t){(t==null||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function Bt(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Ht(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function Oe(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable})),r.push.apply(r,n)}return r}function Ne(e){for(var t=1;t<arguments.length;t++){var r=arguments[t]!=null?arguments[t]:{};t%2?Oe(Object(r),!0).forEach(function(n){Ht(e,n,r[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):Oe(Object(r)).forEach(function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(r,n))})}return e}function Jt(){for(var e=arguments.length,t=new Array(e),r=0;r<e;r++)t[r]=arguments[r];return function(n){return t.reduceRight(function(a,i){return i(a)},n)}}function Q(e){return function t(){for(var r=this,n=arguments.length,a=new Array(n),i=0;i<n;i++)a[i]=arguments[i];return a.length>=e.length?e.apply(this,a):function(){for(var s=arguments.length,f=new Array(s),l=0;l<s;l++)f[l]=arguments[l];return t.apply(r,[].concat(a,f))}}}function pe(e){return{}.toString.call(e).includes("Object")}function Yt(e){return!Object.keys(e).length}function Z(e){return typeof e=="function"}function Qt(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function Xt(e,t){return pe(t)||D("changeType"),Object.keys(t).some(function(r){return!Qt(e,r)})&&D("changeField"),t}function Zt(e){Z(e)||D("selectorType")}function er(e){Z(e)||pe(e)||D("handlerType"),pe(e)&&Object.values(e).some(function(t){return!Z(t)})&&D("handlersType")}function tr(e){e||D("initialIsRequired"),pe(e)||D("initialType"),Yt(e)&&D("initialContent")}function rr(e,t){throw new Error(e[t]||e.default)}var nr={initialIsRequired:"initial state is required",initialType:"initial state should be an object",initialContent:"initial state shouldn't be an empty object",handlerType:"handler should be an object or a function",handlersType:"all handlers should be a functions",selectorType:"selector should be a function",changeType:"provided value of changes should be an object",changeField:'it seams you want to change a field in the state which is not specified in the "initial" state',default:"an unknown error accured in `state-local` package"},D=Q(rr)(nr),re={changes:Xt,selector:Zt,handler:er,initial:tr};function ar(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};re.initial(e),re.handler(t);var r={current:e},n=Q(sr)(r,t),a=Q(ir)(r),i=Q(re.changes)(e),s=Q(or)(r);function f(){var m=arguments.length>0&&arguments[0]!==void 0?arguments[0]:function(p){return p};return re.selector(m),m(r.current)}function l(m){Jt(n,a,i,s)(m)}return[f,l]}function or(e,t){return Z(t)?t(e.current):t}function ir(e,t){return e.current=Ne(Ne({},e.current),t),t}function sr(e,t,r){return Z(t)?t(e.current):Object.keys(r).forEach(function(n){var a;return(a=t[n])===null||a===void 0?void 0:a.call(t,e.current[n])}),r}var cr={create:ar},ur={paths:{vs:"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"}};function lr(e){return function t(){for(var r=this,n=arguments.length,a=new Array(n),i=0;i<n;i++)a[i]=arguments[i];return a.length>=e.length?e.apply(this,a):function(){for(var s=arguments.length,f=new Array(s),l=0;l<s;l++)f[l]=arguments[l];return t.apply(r,[].concat(a,f))}}}function dr(e){return{}.toString.call(e).includes("Object")}function pr(e){return e||_e("configIsRequired"),dr(e)||_e("configType"),e.urls?(fr(),{paths:{vs:e.urls.monacoBase}}):e}function fr(){console.warn(st.deprecation)}function gr(e,t){throw new Error(e[t]||e.default)}var st={configIsRequired:"the configuration object is required",configType:"the configuration object should be an object",default:"an unknown error accured in `@monaco-editor/loader` package",deprecation:`Deprecation warning!
    You are using deprecated way of configuration.

    Instead of using
      monaco.config({ urls: { monacoBase: '...' } })
    use
      monaco.config({ paths: { vs: '...' } })

    For more please check the link https://github.com/suren-atoyan/monaco-loader#config
  `},_e=lr(gr)(st),mr={config:pr},vr=function(){for(var t=arguments.length,r=new Array(t),n=0;n<t;n++)r[n]=arguments[n];return function(a){return r.reduceRight(function(i,s){return s(i)},a)}};function ct(e,t){return Object.keys(t).forEach(function(r){t[r]instanceof Object&&e[r]&&Object.assign(t[r],ct(e[r],t[r]))}),Me(Me({},e),t)}var hr={type:"cancelation",msg:"operation is manually canceled"};function he(e){var t=!1,r=new Promise(function(n,a){e.then(function(i){return t?a(hr):n(i)}),e.catch(a)});return r.cancel=function(){return t=!0},r}var br=cr.create({config:ur,isInitialized:!1,resolve:null,reject:null,monaco:null}),ut=Wt(br,2),ee=ut[0],me=ut[1];function yr(e){var t=mr.config(e),r=t.monaco,n=$t(t,["monaco"]);me(function(a){return{config:ct(a.config,n),monaco:r}})}function wr(){var e=ee(function(t){var r=t.monaco,n=t.isInitialized,a=t.resolve;return{monaco:r,isInitialized:n,resolve:a}});if(!e.isInitialized){if(me({isInitialized:!0}),e.monaco)return e.resolve(e.monaco),he(be);if(window.monaco&&window.monaco.editor)return lt(window.monaco),e.resolve(window.monaco),he(be);vr(xr,jr)(Er)}return he(be)}function xr(e){return document.body.appendChild(e)}function Sr(e){var t=document.createElement("script");return e&&(t.src=e),t}function jr(e){var t=ee(function(n){var a=n.config,i=n.reject;return{config:a,reject:i}}),r=Sr("".concat(t.config.paths.vs,"/loader.js"));return r.onload=function(){return e()},r.onerror=t.reject,r}function Er(){var e=ee(function(r){var n=r.config,a=r.resolve,i=r.reject;return{config:n,resolve:a,reject:i}}),t=window.require;t.config(e.config),t(["vs/editor/editor.main"],function(r){lt(r),e.resolve(r)},function(r){e.reject(r)})}function lt(e){ee().monaco||me({monaco:e})}function Cr(){return ee(function(e){var t=e.monaco;return t})}var be=new Promise(function(e,t){return me({resolve:e,reject:t})}),dt={config:yr,init:wr,__getMonacoInstance:Cr},Tr={wrapper:{display:"flex",position:"relative",textAlign:"initial"},fullWidth:{width:"100%"},hide:{display:"none"}},ye=Tr,Mr={container:{display:"flex",height:"100%",width:"100%",justifyContent:"center",alignItems:"center"}},Ir=Mr;function Or({children:e}){return K.createElement("div",{style:Ir.container},e)}var Nr=Or,_r=Nr;function Ar({width:e,height:t,isEditorReady:r,loading:n,_ref:a,className:i,wrapperProps:s}){return K.createElement("section",{style:{...ye.wrapper,width:e,height:t},...s},!r&&K.createElement(_r,null,n),K.createElement("div",{ref:a,style:{...ye.fullWidth,...!r&&ye.hide},className:i}))}var Rr=Ar,pt=o.memo(Rr);function Pr(e){o.useEffect(e,[])}var ft=Pr;function Fr(e,t,r=!0){let n=o.useRef(!0);o.useEffect(n.current||!r?()=>{n.current=!1}:e,t)}var A=Fr;function X(){}function U(e,t,r,n){return Lr(e,n)||qr(e,t,r,n)}function Lr(e,t){return e.editor.getModel(gt(e,t))}function qr(e,t,r,n){return e.editor.createModel(t,r,n?gt(e,n):void 0)}function gt(e,t){return e.Uri.parse(t)}function Dr({original:e,modified:t,language:r,originalLanguage:n,modifiedLanguage:a,originalModelPath:i,modifiedModelPath:s,keepCurrentOriginalModel:f=!1,keepCurrentModifiedModel:l=!1,theme:m="light",loading:p="Loading...",options:v={},height:x="100%",width:N="100%",className:R,wrapperProps:P={},beforeMount:y=X,onMount:O=X}){let[S,E]=o.useState(!1),[C,u]=o.useState(!0),M=o.useRef(null),j=o.useRef(null),T=o.useRef(null),I=o.useRef(O),h=o.useRef(y),F=o.useRef(!1);ft(()=>{let d=dt.init();return d.then(g=>(j.current=g)&&u(!1)).catch(g=>(g==null?void 0:g.type)!=="cancelation"&&console.error("Monaco initialization: error:",g)),()=>M.current?$():d.cancel()}),A(()=>{if(M.current&&j.current){let d=M.current.getOriginalEditor(),g=U(j.current,e||"",n||r||"text",i||"");g!==d.getModel()&&d.setModel(g)}},[i],S),A(()=>{if(M.current&&j.current){let d=M.current.getModifiedEditor(),g=U(j.current,t||"",a||r||"text",s||"");g!==d.getModel()&&d.setModel(g)}},[s],S),A(()=>{let d=M.current.getModifiedEditor();d.getOption(j.current.editor.EditorOption.readOnly)?d.setValue(t||""):t!==d.getValue()&&(d.executeEdits("",[{range:d.getModel().getFullModelRange(),text:t||"",forceMoveMarkers:!0}]),d.pushUndoStop())},[t],S),A(()=>{var d,g;(g=(d=M.current)==null?void 0:d.getModel())==null||g.original.setValue(e||"")},[e],S),A(()=>{let{original:d,modified:g}=M.current.getModel();j.current.editor.setModelLanguage(d,n||r||"text"),j.current.editor.setModelLanguage(g,a||r||"text")},[r,n,a],S),A(()=>{var d;(d=j.current)==null||d.editor.setTheme(m)},[m],S),A(()=>{var d;(d=M.current)==null||d.updateOptions(v)},[v],S);let V=o.useCallback(()=>{var q;if(!j.current)return;h.current(j.current);let d=U(j.current,e||"",n||r||"text",i||""),g=U(j.current,t||"",a||r||"text",s||"");(q=M.current)==null||q.setModel({original:d,modified:g})},[r,t,a,e,n,i,s]),G=o.useCallback(()=>{var d;!F.current&&T.current&&(M.current=j.current.editor.createDiffEditor(T.current,{automaticLayout:!0,...v}),V(),(d=j.current)==null||d.editor.setTheme(m),E(!0),F.current=!0)},[v,m,V]);o.useEffect(()=>{S&&I.current(M.current,j.current)},[S]),o.useEffect(()=>{!C&&!S&&G()},[C,S,G]);function $(){var g,q,W,J;let d=(g=M.current)==null?void 0:g.getModel();f||((q=d==null?void 0:d.original)==null||q.dispose()),l||((W=d==null?void 0:d.modified)==null||W.dispose()),(J=M.current)==null||J.dispose()}return K.createElement(pt,{width:N,height:x,isEditorReady:S,loading:p,_ref:T,className:R,wrapperProps:P})}var kr=Dr;o.memo(kr);function Vr(e){let t=o.useRef();return o.useEffect(()=>{t.current=e},[e]),t.current}var Gr=Vr,ne=new Map;function $r({defaultValue:e,defaultLanguage:t,defaultPath:r,value:n,language:a,path:i,theme:s="light",line:f,loading:l="Loading...",options:m={},overrideServices:p={},saveViewState:v=!0,keepCurrentModel:x=!1,width:N="100%",height:R="100%",className:P,wrapperProps:y={},beforeMount:O=X,onMount:S=X,onChange:E,onValidate:C=X}){let[u,M]=o.useState(!1),[j,T]=o.useState(!0),I=o.useRef(null),h=o.useRef(null),F=o.useRef(null),V=o.useRef(S),G=o.useRef(O),$=o.useRef(),d=o.useRef(n),g=Gr(i),q=o.useRef(!1),W=o.useRef(!1);ft(()=>{let b=dt.init();return b.then(w=>(I.current=w)&&T(!1)).catch(w=>(w==null?void 0:w.type)!=="cancelation"&&console.error("Monaco initialization: error:",w)),()=>h.current?Pt():b.cancel()}),A(()=>{var w,_,Y,z;let b=U(I.current,e||n||"",t||a||"",i||r||"");b!==((w=h.current)==null?void 0:w.getModel())&&(v&&ne.set(g,(_=h.current)==null?void 0:_.saveViewState()),(Y=h.current)==null||Y.setModel(b),v&&((z=h.current)==null||z.restoreViewState(ne.get(i))))},[i],u),A(()=>{var b;(b=h.current)==null||b.updateOptions(m)},[m],u),A(()=>{!h.current||n===void 0||(h.current.getOption(I.current.editor.EditorOption.readOnly)?h.current.setValue(n):n!==h.current.getValue()&&(W.current=!0,h.current.executeEdits("",[{range:h.current.getModel().getFullModelRange(),text:n,forceMoveMarkers:!0}]),h.current.pushUndoStop(),W.current=!1))},[n],u),A(()=>{var w,_;let b=(w=h.current)==null?void 0:w.getModel();b&&a&&((_=I.current)==null||_.editor.setModelLanguage(b,a))},[a],u),A(()=>{var b;f!==void 0&&((b=h.current)==null||b.revealLine(f))},[f],u),A(()=>{var b;(b=I.current)==null||b.editor.setTheme(s)},[s],u);let J=o.useCallback(()=>{var b;if(!(!F.current||!I.current)&&!q.current){G.current(I.current);let w=i||r,_=U(I.current,n||e||"",t||a||"",w||"");h.current=(b=I.current)==null?void 0:b.editor.create(F.current,{model:_,automaticLayout:!0,...m},p),v&&h.current.restoreViewState(ne.get(w)),I.current.editor.setTheme(s),f!==void 0&&h.current.revealLine(f),M(!0),q.current=!0}},[e,t,r,n,a,i,m,p,v,s,f]);o.useEffect(()=>{u&&V.current(h.current,I.current)},[u]),o.useEffect(()=>{!j&&!u&&J()},[j,u,J]),d.current=n,o.useEffect(()=>{var b,w;u&&E&&((b=$.current)==null||b.dispose(),$.current=(w=h.current)==null?void 0:w.onDidChangeModelContent(_=>{W.current||E(h.current.getValue(),_)}))},[u,E]),o.useEffect(()=>{if(u){let b=I.current.editor.onDidChangeMarkers(w=>{var Y;let _=(Y=h.current.getModel())==null?void 0:Y.uri;if(_&&w.find(z=>z.path===_.path)){let z=I.current.editor.getModelMarkers({resource:_});C==null||C(z)}});return()=>{b==null||b.dispose()}}return()=>{}},[u,C]);function Pt(){var b,w;(b=$.current)==null||b.dispose(),x?v&&ne.set(i,h.current.saveViewState()):(w=h.current.getModel())==null||w.dispose(),h.current.dispose()}return K.createElement(pt,{width:N,height:R,isEditorReady:u,loading:l,_ref:F,className:P,wrapperProps:y})}var Wr=$r,zr=o.memo(Wr),Ae=zr,we="rovingFocusGroup.onEntryFocus",Ur={bubbles:!1,cancelable:!0},te="RovingFocusGroup",[xe,mt,Kr]=Ft(te),[Br,vt]=nt(te,[Kr]),[Hr,Jr]=Br(te),ht=o.forwardRef((e,t)=>c.jsx(xe.Provider,{scope:e.__scopeRovingFocusGroup,children:c.jsx(xe.Slot,{scope:e.__scopeRovingFocusGroup,children:c.jsx(Yr,{...e,ref:t})})}));ht.displayName=te;var Yr=o.forwardRef((e,t)=>{const{__scopeRovingFocusGroup:r,orientation:n,loop:a=!1,dir:i,currentTabStopId:s,defaultCurrentTabStopId:f,onCurrentTabStopIdChange:l,onEntryFocus:m,preventScrollOnEntryFocus:p=!1,...v}=e,x=o.useRef(null),N=Lt(t,x),R=at(i),[P,y]=ot({prop:s,defaultProp:f??null,onChange:l,caller:te}),[O,S]=o.useState(!1),E=qt(m),C=mt(r),u=o.useRef(!1),[M,j]=o.useState(0);return o.useEffect(()=>{const T=x.current;if(T)return T.addEventListener(we,E),()=>T.removeEventListener(we,E)},[E]),c.jsx(Hr,{scope:r,orientation:n,dir:R,loop:a,currentTabStopId:P,onItemFocus:o.useCallback(T=>y(T),[y]),onItemShiftTab:o.useCallback(()=>S(!0),[]),onFocusableItemAdd:o.useCallback(()=>j(T=>T+1),[]),onFocusableItemRemove:o.useCallback(()=>j(T=>T-1),[]),children:c.jsx(H.div,{tabIndex:O||M===0?-1:0,"data-orientation":n,...v,ref:N,style:{outline:"none",...e.style},onMouseDown:L(e.onMouseDown,()=>{u.current=!0}),onFocus:L(e.onFocus,T=>{const I=!u.current;if(T.target===T.currentTarget&&I&&!O){const h=new CustomEvent(we,Ur);if(T.currentTarget.dispatchEvent(h),!h.defaultPrevented){const F=C().filter(g=>g.focusable),V=F.find(g=>g.active),G=F.find(g=>g.id===P),d=[V,G,...F].filter(Boolean).map(g=>g.ref.current);wt(d,p)}}u.current=!1}),onBlur:L(e.onBlur,()=>S(!1))})})}),bt="RovingFocusGroupItem",yt=o.forwardRef((e,t)=>{const{__scopeRovingFocusGroup:r,focusable:n=!0,active:a=!1,tabStopId:i,children:s,...f}=e,l=it(),m=i||l,p=Jr(bt,r),v=p.currentTabStopId===m,x=mt(r),{onFocusableItemAdd:N,onFocusableItemRemove:R,currentTabStopId:P}=p;return o.useEffect(()=>{if(n)return N(),()=>R()},[n,N,R]),c.jsx(xe.ItemSlot,{scope:r,id:m,focusable:n,active:a,children:c.jsx(H.span,{tabIndex:v?0:-1,"data-orientation":p.orientation,...f,ref:t,onMouseDown:L(e.onMouseDown,y=>{n?p.onItemFocus(m):y.preventDefault()}),onFocus:L(e.onFocus,()=>p.onItemFocus(m)),onKeyDown:L(e.onKeyDown,y=>{if(y.key==="Tab"&&y.shiftKey){p.onItemShiftTab();return}if(y.target!==y.currentTarget)return;const O=Zr(y,p.orientation,p.dir);if(O!==void 0){if(y.metaKey||y.ctrlKey||y.altKey||y.shiftKey)return;y.preventDefault();let E=x().filter(C=>C.focusable).map(C=>C.ref.current);if(O==="last")E.reverse();else if(O==="prev"||O==="next"){O==="prev"&&E.reverse();const C=E.indexOf(y.currentTarget);E=p.loop?en(E,C+1):E.slice(C+1)}setTimeout(()=>wt(E))}}),children:typeof s=="function"?s({isCurrentTabStop:v,hasTabStop:P!=null}):s})})});yt.displayName=bt;var Qr={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function Xr(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function Zr(e,t,r){const n=Xr(e.key,r);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(n))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(n)))return Qr[n]}function wt(e,t=!1){const r=document.activeElement;for(const n of e)if(n===r||(n.focus({preventScroll:t}),document.activeElement!==r))return}function en(e,t){return e.map((r,n)=>e[(t+n)%e.length])}var tn=ht,rn=yt,ve="Tabs",[nn,dn]=nt(ve,[vt]),xt=vt(),[an,Ce]=nn(ve),St=o.forwardRef((e,t)=>{const{__scopeTabs:r,value:n,onValueChange:a,defaultValue:i,orientation:s="horizontal",dir:f,activationMode:l="automatic",...m}=e,p=at(f),[v,x]=ot({prop:n,onChange:a,defaultProp:i??"",caller:ve});return c.jsx(an,{scope:r,baseId:it(),value:v,onValueChange:x,orientation:s,dir:p,activationMode:l,children:c.jsx(H.div,{dir:p,"data-orientation":s,...m,ref:t})})});St.displayName=ve;var jt="TabsList",Et=o.forwardRef((e,t)=>{const{__scopeTabs:r,loop:n=!0,...a}=e,i=Ce(jt,r),s=xt(r);return c.jsx(tn,{asChild:!0,...s,orientation:i.orientation,dir:i.dir,loop:n,children:c.jsx(H.div,{role:"tablist","aria-orientation":i.orientation,...a,ref:t})})});Et.displayName=jt;var Ct="TabsTrigger",Tt=o.forwardRef((e,t)=>{const{__scopeTabs:r,value:n,disabled:a=!1,...i}=e,s=Ce(Ct,r),f=xt(r),l=Ot(s.baseId,n),m=Nt(s.baseId,n),p=n===s.value;return c.jsx(rn,{asChild:!0,...f,focusable:!a,active:p,children:c.jsx(H.button,{type:"button",role:"tab","aria-selected":p,"aria-controls":m,"data-state":p?"active":"inactive","data-disabled":a?"":void 0,disabled:a,id:l,...i,ref:t,onMouseDown:L(e.onMouseDown,v=>{!a&&v.button===0&&v.ctrlKey===!1?s.onValueChange(n):v.preventDefault()}),onKeyDown:L(e.onKeyDown,v=>{[" ","Enter"].includes(v.key)&&s.onValueChange(n)}),onFocus:L(e.onFocus,()=>{const v=s.activationMode!=="manual";!p&&!a&&v&&s.onValueChange(n)})})})});Tt.displayName=Ct;var Mt="TabsContent",It=o.forwardRef((e,t)=>{const{__scopeTabs:r,value:n,forceMount:a,children:i,...s}=e,f=Ce(Mt,r),l=Ot(f.baseId,n),m=Nt(f.baseId,n),p=n===f.value,v=o.useRef(p);return o.useEffect(()=>{const x=requestAnimationFrame(()=>v.current=!1);return()=>cancelAnimationFrame(x)},[]),c.jsx(Dt,{present:a||p,children:({present:x})=>c.jsx(H.div,{"data-state":p?"active":"inactive","data-orientation":f.orientation,role:"tabpanel","aria-labelledby":l,hidden:!x,id:m,tabIndex:0,...s,ref:t,style:{...e.style,animationDuration:v.current?"0s":void 0},children:x&&i})})});It.displayName=Mt;function Ot(e,t){return`${e}-trigger-${t}`}function Nt(e,t){return`${e}-content-${t}`}var on=St,_t=Et,At=Tt,Rt=It;const Se=on,fe=o.forwardRef(({className:e,...t},r)=>c.jsx(_t,{ref:r,className:Ee("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",e),...t}));fe.displayName=_t.displayName;const B=o.forwardRef(({className:e,...t},r)=>c.jsx(At,{ref:r,className:Ee("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",e),...t}));B.displayName=At.displayName;const je=o.forwardRef(({className:e,...t},r)=>c.jsx(Rt,{ref:r,className:Ee("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",e),...t}));je.displayName=Rt.displayName;try{Se.displayName="Tabs",Se.__docgenInfo={description:"",displayName:"Tabs",props:{asChild:{defaultValue:null,description:"",name:"asChild",required:!1,type:{name:"boolean"}}}}}catch{}try{fe.displayName="TabsList",fe.__docgenInfo={description:"",displayName:"TabsList",props:{asChild:{defaultValue:null,description:"",name:"asChild",required:!1,type:{name:"boolean"}}}}}catch{}try{B.displayName="TabsTrigger",B.__docgenInfo={description:"",displayName:"TabsTrigger",props:{asChild:{defaultValue:null,description:"",name:"asChild",required:!1,type:{name:"boolean"}}}}}catch{}try{je.displayName="TabsContent",je.__docgenInfo={description:"",displayName:"TabsContent",props:{asChild:{defaultValue:null,description:"",name:"asChild",required:!1,type:{name:"boolean"}}}}}catch{}const ge=({value:e,onChange:t,language:r="markdown",placeholder:n="Start typing...",height:a="400px",autoSave:i=!1,onSave:s,className:f=""})=>{const[l,m]=o.useState(e),[p,v]=o.useState("edit"),[x,N]=o.useState(!1),[R,P]=o.useState(null);o.useEffect(()=>{if(i&&x&&s){const u=setTimeout(()=>{s(l),P(new Date),N(!1)},2e3);return()=>clearTimeout(u)}},[l,i,x,s]),o.useEffect(()=>{e!==l&&(m(e),N(!1))},[e]);const y=o.useCallback(u=>{u!==void 0&&(m(u),t(u),N(!0))},[t]),O=o.useCallback(()=>{s&&(s(l),P(new Date),N(!1))},[l,s]),S=u=>u.includes("```javascript")||u.includes("```js")?"javascript":u.includes("```typescript")||u.includes("```ts")?"typescript":u.includes("```python")||u.includes("```py")?"python":u.includes("```json")?"json":u.includes("```yaml")||u.includes("```yml")?"yaml":u.includes("```css")?"css":u.includes("```html")?"html":u.includes("```sql")?"sql":u.includes("```bash")||u.includes("```sh")?"shell":/function\s+\w+\s*\(/.test(u)||/const\s+\w+\s*=/.test(u)?"javascript":/def\s+\w+\s*\(/.test(u)||/import\s+\w+/.test(u)?"python":/\{[\s\S]*"[\w]+"\s*:/.test(u)?"json":"markdown",E=()=>c.jsx("div",{className:"prose prose-invert max-w-none p-4 h-full overflow-auto bg-gray-900 border border-gray-700 rounded-lg",children:c.jsx("pre",{className:"whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed",children:l||n})}),C={minimap:{enabled:!1},fontSize:14,lineHeight:1.6,wordWrap:"on",theme:"vs-dark",automaticLayout:!0,scrollBeyondLastLine:!1,folding:!0,lineNumbers:"on",renderWhitespace:"selection",bracketPairColorization:{enabled:!0},suggest:{showKeywords:!0,showSnippets:!0}};return c.jsxs("div",{className:`advanced-editor ${f}`,children:[c.jsxs("div",{className:"flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-t-lg",children:[c.jsxs("div",{className:"flex items-center gap-4",children:[c.jsx(Se,{value:p,onValueChange:u=>v(u),className:"w-auto",children:c.jsxs(fe,{className:"grid w-full grid-cols-3 bg-gray-700",children:[c.jsx(B,{value:"edit",className:"text-xs",children:"Edit"}),c.jsx(B,{value:"preview",className:"text-xs",children:"Preview"}),c.jsx(B,{value:"split",className:"text-xs",children:"Split"})]})}),c.jsxs("div",{className:"text-xs text-gray-400 flex items-center gap-2",children:[c.jsx("span",{className:"w-2 h-2 bg-blue-400 rounded-full"}),c.jsx("span",{className:"capitalize",children:S(l)})]})]}),c.jsxs("div",{className:"flex items-center gap-3",children:[x&&c.jsxs("span",{className:"text-xs text-yellow-400 flex items-center gap-1",children:[c.jsx("span",{className:"w-1 h-1 bg-yellow-400 rounded-full animate-pulse"}),"Unsaved changes"]}),R&&!x&&c.jsxs("span",{className:"text-xs text-gray-400",children:["Saved ",R.toLocaleTimeString()]}),s&&c.jsx(kt,{size:"sm",variant:"ghost",onClick:O,disabled:!x,className:"text-xs h-7 px-2",children:x?"💾 Save":"✓ Saved"})]})]}),c.jsxs("div",{className:"border border-t-0 border-gray-700 rounded-b-lg overflow-hidden",style:{height:a},children:[p==="edit"&&c.jsx(Ae,{value:l,onChange:y,language:S(l),options:C,theme:"vs-dark"}),p==="preview"&&E(),p==="split"&&c.jsxs("div",{className:"flex h-full",children:[c.jsx("div",{className:"flex-1 border-r border-gray-700",children:c.jsx(Ae,{value:l,onChange:y,language:S(l),options:{...C,minimap:{enabled:!1}},theme:"vs-dark"})}),c.jsx("div",{className:"flex-1",children:E()})]})]}),c.jsxs("div",{className:"flex items-center justify-between p-2 bg-gray-800/50 text-xs text-gray-400 border border-t-0 border-gray-700 rounded-b-lg",children:[c.jsxs("div",{className:"flex items-center gap-4",children:[c.jsxs("span",{children:["Lines: ",l.split(`
`).length]}),c.jsxs("span",{children:["Characters: ",l.length]}),c.jsxs("span",{children:["Words: ",l.split(/\s+/).filter(Boolean).length]})]}),c.jsxs("div",{className:"flex items-center gap-2",children:[i&&c.jsxs("span",{className:"flex items-center gap-1",children:[c.jsx("span",{className:"w-1 h-1 bg-green-400 rounded-full animate-pulse"}),"Auto-save enabled"]}),c.jsx("span",{children:"Ctrl+S to save"})]})]})]})};try{ge.displayName="AdvancedEditor",ge.__docgenInfo={description:"",displayName:"AdvancedEditor",props:{value:{defaultValue:null,description:"",name:"value",required:!0,type:{name:"string"}},onChange:{defaultValue:null,description:"",name:"onChange",required:!0,type:{name:"(value: string) => void"}},language:{defaultValue:{value:"markdown"},description:"",name:"language",required:!1,type:{name:"string"}},placeholder:{defaultValue:{value:"Start typing..."},description:"",name:"placeholder",required:!1,type:{name:"string"}},height:{defaultValue:{value:"400px"},description:"",name:"height",required:!1,type:{name:"string"}},autoSave:{defaultValue:{value:"false"},description:"",name:"autoSave",required:!1,type:{name:"boolean"}},onSave:{defaultValue:null,description:"",name:"onSave",required:!1,type:{name:"(value: string) => void"}},className:{defaultValue:{value:""},description:"",name:"className",required:!1,type:{name:"string"}}}}}catch{}const pn={title:"Components/AdvancedEditor",component:ge,parameters:{layout:"padded",docs:{description:{component:`
# Advanced Editor Component

A powerful Monaco-based editor with multiple view modes, auto-save, and language detection.

## Features:
- **Monaco Editor Integration**: Full-featured code editor
- **Multiple View Modes**: Edit, Preview, Split-view
- **Auto-save**: Configurable auto-save with visual feedback
- **Language Detection**: Automatic syntax highlighting
- **Real-time Stats**: Line count, character count, word count
- **Save Status**: Visual indicators for unsaved changes

## Language Support:
- Markdown (default)
- JavaScript/TypeScript
- Python
- JSON/YAML
- CSS/HTML
- SQL/Shell
- Auto-detection based on content patterns
        `}}},argTypes:{language:{control:{type:"select"},options:["markdown","javascript","typescript","python","json","yaml","css","html"]},height:{control:{type:"text"}},autoSave:{control:{type:"boolean"}}}},k=e=>{const[t,r]=o.useState(e.value||"");return c.jsx(ge,{...e,value:t,onChange:r,onSave:n=>{console.log("Saved:",n),alert("Content saved! Check console for details.")}})},ae={render:k,args:{value:`# Welcome to Advanced Editor

Start typing your content here...

## Features
- Monaco editor integration
- Multiple view modes
- Auto-save functionality
- Language detection`,placeholder:"Start typing...",height:"400px",autoSave:!1}},oe={render:k,args:{value:`// JavaScript Example
function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}

const cart = [
  { name: 'Apple', price: 1.20, quantity: 3 },
  { name: 'Banana', price: 0.80, quantity: 6 }
];

console.log('Total:', calculateTotal(cart));`,language:"javascript",height:"350px",autoSave:!0}},ie={render:k,args:{value:`# Project Documentation

## Overview
This is a comprehensive guide to using the advanced editor component.

### Key Features
1. **Rich Text Editing** - Full Monaco editor support
2. **Live Preview** - See rendered output in real-time
3. **Auto-save** - Never lose your work
4. **Multi-language** - Support for various programming languages

### Code Examples

\`\`\`javascript
const example = {
  language: 'javascript',
  features: ['syntax highlighting', 'autocomplete', 'error detection']
};
\`\`\`

### Installation
\`\`\`bash
npm install @monaco-editor/react
\`\`\`

> **Note**: This editor automatically detects the language based on content patterns.`,height:"500px",autoSave:!0}},se={render:k,args:{value:`# Python Example
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    
    return sequence

# Generate first 10 Fibonacci numbers
result = fibonacci(10)
print(f"First 10 Fibonacci numbers: {result}")

# Class example
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result`,language:"python",height:"450px",autoSave:!1}},ce={render:k,args:{value:`{
  "name": "Advanced Editor Component",
  "version": "1.0.0",
  "description": "A powerful Monaco-based editor with multiple features",
  "features": {
    "editing": {
      "modes": ["edit", "preview", "split"],
      "autoSave": true,
      "languageDetection": true
    },
    "supported_languages": [
      "markdown",
      "javascript",
      "typescript",
      "python",
      "json",
      "yaml",
      "css",
      "html",
      "sql",
      "shell"
    ],
    "statistics": {
      "lines": true,
      "characters": true,
      "words": true
    }
  },
  "configuration": {
    "theme": "vs-dark",
    "fontSize": 14,
    "lineHeight": 1.6,
    "wordWrap": true,
    "minimap": false
  }
}`,language:"json",height:"400px",autoSave:!0}},ue={render:k,args:{value:`# Auto-save Demo

This editor has auto-save enabled. Try typing and watch the save status indicators.

Changes are automatically saved after 2 seconds of inactivity.

## Status Indicators:
- Yellow dot = Unsaved changes
- Green checkmark = Content saved
- Timestamp = Last save time

Start typing to see the auto-save in action...`,height:"350px",autoSave:!0}},le={render:k,args:{value:"Quick note or code snippet...",height:"200px",autoSave:!1}},de={render:k,args:{value:`# Large Editor View

This is a larger editor instance suitable for editing longer documents or complex code files.

## Extended Content Area

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Code Section

\`\`\`typescript
interface EditorConfig {
  height: string;
  autoSave: boolean;
  language: string;
  theme: 'vs-dark' | 'vs-light';
}

class AdvancedEditorManager {
  private config: EditorConfig;
  
  constructor(config: EditorConfig) {
    this.config = config;
  }
  
  public initialize(): void {
    // Editor initialization logic
    console.log('Editor initialized with config:', this.config);
  }
}
\`\`\`

### More Content

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,height:"600px",autoSave:!0}};var Re,Pe,Fe;ae.parameters={...ae.parameters,docs:{...(Re=ae.parameters)==null?void 0:Re.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: '# Welcome to Advanced Editor\\n\\nStart typing your content here...\\n\\n## Features\\n- Monaco editor integration\\n- Multiple view modes\\n- Auto-save functionality\\n- Language detection',
    placeholder: 'Start typing...',
    height: '400px',
    autoSave: false
  }
}`,...(Fe=(Pe=ae.parameters)==null?void 0:Pe.docs)==null?void 0:Fe.source}}};var Le,qe,De;oe.parameters={...oe.parameters,docs:{...(Le=oe.parameters)==null?void 0:Le.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`// JavaScript Example
function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}

const cart = [
  { name: 'Apple', price: 1.20, quantity: 3 },
  { name: 'Banana', price: 0.80, quantity: 6 }
];

console.log('Total:', calculateTotal(cart));\`,
    language: 'javascript',
    height: '350px',
    autoSave: true
  }
}`,...(De=(qe=oe.parameters)==null?void 0:qe.docs)==null?void 0:De.source}}};var ke,Ve,Ge;ie.parameters={...ie.parameters,docs:{...(ke=ie.parameters)==null?void 0:ke.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`# Project Documentation

## Overview
This is a comprehensive guide to using the advanced editor component.

### Key Features
1. **Rich Text Editing** - Full Monaco editor support
2. **Live Preview** - See rendered output in real-time
3. **Auto-save** - Never lose your work
4. **Multi-language** - Support for various programming languages

### Code Examples

\\\`\\\`\\\`javascript
const example = {
  language: 'javascript',
  features: ['syntax highlighting', 'autocomplete', 'error detection']
};
\\\`\\\`\\\`

### Installation
\\\`\\\`\\\`bash
npm install @monaco-editor/react
\\\`\\\`\\\`

> **Note**: This editor automatically detects the language based on content patterns.\`,
    height: '500px',
    autoSave: true
  }
}`,...(Ge=(Ve=ie.parameters)==null?void 0:Ve.docs)==null?void 0:Ge.source}}};var $e,We,ze;se.parameters={...se.parameters,docs:{...($e=se.parameters)==null?void 0:$e.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`# Python Example
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    
    return sequence

# Generate first 10 Fibonacci numbers
result = fibonacci(10)
print(f"First 10 Fibonacci numbers: {result}")

# Class example
class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result\`,
    language: 'python',
    height: '450px',
    autoSave: false
  }
}`,...(ze=(We=se.parameters)==null?void 0:We.docs)==null?void 0:ze.source}}};var Ue,Ke,Be;ce.parameters={...ce.parameters,docs:{...(Ue=ce.parameters)==null?void 0:Ue.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`{
  "name": "Advanced Editor Component",
  "version": "1.0.0",
  "description": "A powerful Monaco-based editor with multiple features",
  "features": {
    "editing": {
      "modes": ["edit", "preview", "split"],
      "autoSave": true,
      "languageDetection": true
    },
    "supported_languages": [
      "markdown",
      "javascript",
      "typescript",
      "python",
      "json",
      "yaml",
      "css",
      "html",
      "sql",
      "shell"
    ],
    "statistics": {
      "lines": true,
      "characters": true,
      "words": true
    }
  },
  "configuration": {
    "theme": "vs-dark",
    "fontSize": 14,
    "lineHeight": 1.6,
    "wordWrap": true,
    "minimap": false
  }
}\`,
    language: 'json',
    height: '400px',
    autoSave: true
  }
}`,...(Be=(Ke=ce.parameters)==null?void 0:Ke.docs)==null?void 0:Be.source}}};var He,Je,Ye;ue.parameters={...ue.parameters,docs:{...(He=ue.parameters)==null?void 0:He.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`# Auto-save Demo

This editor has auto-save enabled. Try typing and watch the save status indicators.

Changes are automatically saved after 2 seconds of inactivity.

## Status Indicators:
- Yellow dot = Unsaved changes
- Green checkmark = Content saved
- Timestamp = Last save time

Start typing to see the auto-save in action...\`,
    height: '350px',
    autoSave: true
  }
}`,...(Ye=(Je=ue.parameters)==null?void 0:Je.docs)==null?void 0:Ye.source}}};var Qe,Xe,Ze;le.parameters={...le.parameters,docs:{...(Qe=le.parameters)==null?void 0:Qe.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: 'Quick note or code snippet...',
    height: '200px',
    autoSave: false
  }
}`,...(Ze=(Xe=le.parameters)==null?void 0:Xe.docs)==null?void 0:Ze.source}}};var et,tt,rt;de.parameters={...de.parameters,docs:{...(et=de.parameters)==null?void 0:et.docs,source:{originalSource:`{
  render: EditorWrapper,
  args: {
    value: \`# Large Editor View

This is a larger editor instance suitable for editing longer documents or complex code files.

## Extended Content Area

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Code Section

\\\`\\\`\\\`typescript
interface EditorConfig {
  height: string;
  autoSave: boolean;
  language: string;
  theme: 'vs-dark' | 'vs-light';
}

class AdvancedEditorManager {
  private config: EditorConfig;
  
  constructor(config: EditorConfig) {
    this.config = config;
  }
  
  public initialize(): void {
    // Editor initialization logic
    console.log('Editor initialized with config:', this.config);
  }
}
\\\`\\\`\\\`

### More Content

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\`,
    height: '600px',
    autoSave: true
  }
}`,...(rt=(tt=de.parameters)==null?void 0:tt.docs)==null?void 0:rt.source}}};const fn=["Default","JavaScriptCode","MarkdownDocument","PythonCode","JSONData","WithAutoSave","CompactEditor","LargeEditor"];export{le as CompactEditor,ae as Default,ce as JSONData,oe as JavaScriptCode,de as LargeEditor,ie as MarkdownDocument,se as PythonCode,ue as WithAutoSave,fn as __namedExportsOrder,pn as default};
