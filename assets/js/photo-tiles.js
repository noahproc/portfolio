/* Shared, keyboard-accessible photo tiles and inline pop-ups. */
(() => {
 const triggers=[...document.querySelectorAll('[data-photo-src]')];
 if(!triggers.length)return;
 const dialog=document.createElement('dialog');dialog.className='photo-lightbox';dialog.setAttribute('aria-labelledby','photo-lightbox-caption');
 const close=document.createElement('button');close.type='button';close.className='photo-lightbox-close';close.setAttribute('aria-label','Close photo');close.textContent='×';
 const image=document.createElement('img');image.decoding='async';
 const caption=document.createElement('p');caption.id='photo-lightbox-caption';
 dialog.append(close,image,caption);document.body.append(dialog);
 let opener=null;
 triggers.forEach(trigger=>{
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.addEventListener('click',()=>{
   opener=trigger;image.src=trigger.dataset.photoSrc;image.alt=trigger.dataset.photoAlt||'';caption.textContent=trigger.dataset.photoCaption||'';
   dialog.showModal();close.focus();
  });
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 if(!reduce.matches&&'IntersectionObserver' in window){
  document.body.classList.add('photo-tiles-ready');
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08});
  document.querySelectorAll('.photo-tile').forEach(tile=>{tile.classList.add('photo-enter');observer.observe(tile);});
 }
})();
