/* Small, local interactions; no hover is required to reach content. */
(() => {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('.collage-sticker').forEach(sticker=>{
  sticker.addEventListener('click',()=>{if(reduce.matches)return;sticker.classList.remove('is-popped');requestAnimationFrame(()=>sticker.classList.add('is-popped'));});
  sticker.addEventListener('animationend',()=>sticker.classList.remove('is-popped'));
 });
 if(!document.body.classList.contains('design-home')){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 1440 90');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('coaster-page-rule');
  const path=document.createElementNS(ns,'path');path.setAttribute('d','M-10 65 C100 65 120 12 230 12 S350 75 440 75 S550 20 650 20 S780 75 880 75 S1000 8 1110 8 S1240 65 1450 65');svg.append(path);
  const footer=document.querySelector('footer');if(footer)footer.before(svg);else document.body.append(svg);
 }
})();
