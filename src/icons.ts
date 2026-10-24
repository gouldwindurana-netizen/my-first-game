export const icons: Record<string, string> = {
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>' ,
 leaf:'<path d="M19 4C9 3 3 7 6 15c6 6 14-1 13-11Z"/><path d="M4 21 16 8M9 16l-1-5m1 5 5-1"/>',
 gold:'<path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m4 8 8 5 8-5m-8 5v8m-4-13 8 5"/>',
 heart:'<path d="M20.8 5.6c-2.6-2.7-6.5-1.2-8.8 1.1C9.7 4.4 5.8 2.9 3.2 5.6-1 10 6 17 12 21c6-4 13-11 8.8-15.4Z"/>',
 flag:'<path d="M5 22V3m0 1c6-4 8 4 15 0v11c-7 4-9-4-15 0"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 play:'<path d="m8 4 13 8-13 8Z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
 mute:'<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 meteor:'<path d="m20 2-8 8M22 7l-5 5M15 2l-4 5"/><circle cx="8" cy="16" r="6"/><path d="m6 14 4 4"/>',
 range:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
 upgrade:'<path d="m5 12 7-7 7 7M12 5v16"/>',
 sell:'<path d="M4 6h16l-1 15H5ZM2 3h20M9 3V1h6v2m-6 7v7m6-7v7"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
 shield:'<path d="m12 2 9 4v6c0 5-6 9-9 11-3-2-9-6-9-11V6Z"/><path d="m8 12 3 3 5-6"/>',
 mouse:'<rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 2v7"/>',
 crystal:'<path d="m12 2 8 7-3 10-5 3-5-3L4 9Z"/><path d="m12 2-3 7 3 13 3-13Zm-8 7h16"/>',
 bolt:'<path d="m14 2-9 12h6l-1 8 9-13h-6Z"/>',
 map:'<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Zm6-3v17m8-14v17"/><path d="m11 10 3 3m0-3-3 3"/>',
 settings:'<path d="m9 2-1 3-3 1-3 3 2 3-1 4 3 3 3-1 3 4 4-2 1-3 4-1 1-4-3-2-1-4-4-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 chevron:'<path d="m8 4 8 8-8 8"/>',
 skull:'<path d="M5 16a9 9 0 1 1 14 0v5H5Zm4 1v5m6-5v5"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="m12 14-1 2h2Z"/>',
 crosshair:'<circle cx="12" cy="12" r="7"/><path d="M12 1v7m0 8v7M1 12h7m8 0h7"/>',
 restart:'<path d="M3 10a9 9 0 1 1 1 9M3 3v7h7"/>'
};
export function icon(name:string, cls=''):string { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`; }
export function towerArt(kind: string): string {
 const crystal = kind === 'arcane';
 const tint = crystal ? '#bd8dff' : '#7de5ff';
 const walls = `<path d="m16 48 16-8 16 8v8l-16 7-16-7Z" fill="#303c47"/><path d="m12 47 20-9 20 9-20 9Z" fill="#929283"/><path d="m12 47 20 9v6l-20-9Z" fill="#5d6b6b"/><path d="m32 56 20-9v6l-20 9Z" fill="#3a4b51"/>`;
 const masonry = `<path d="M21 32v18l11 5 11-5V32Z" fill="#8c9795"/><path d="m32 29 11 3v18l-11 5Z" fill="#52656e"/><path d="m21 37 11 4 11-4m-22 8 11 4 11-4M27 39v8m10-9v8" fill="none" stroke="#3d5156" stroke-width=".8"/><path d="M28 45a4 4 0 0 1 8 0v8l-4 2-4-2Z" fill="#162d3b"/>`;
 let tower = '';
 if (kind === 'archer') {
  tower = `<path d="m19 20 13-6 13 6v29l-13 6-13-6Z" fill="#9aa49b"/><path d="m32 14 13 6v29l-13 6Z" fill="#5e7480"/><path d="m19 28 13 5 13-5m-26 8 13 5 13-5m-26 9 13 5 13-5M25 23v7m12-4v9m-12 4v8" stroke="#425863" stroke-width=".7" fill="none"/><path d="M28 43a4 4 0 0 1 8 0v10l-4 2-4-2Z" fill="#253640"/><path d="m16 20 16-7 16 7v7l-16 7-16-7Z" fill="#9ca59c"/><path d="m16 20 16 7 16-7-16-7Z" fill="#c0c1a7"/><path d="m22 20 10-4 10 4-10 5Z" fill="#3e5560"/><path d="M16 17v9l5 2v-9m8-6v8l6 2v-8m8 2v9l5-2v-8" stroke="#c3c4ab" stroke-width="4" fill="none"/><path d="M36 30v18l7-4V28Z" fill="#1d5b8e"/><path d="m39 31 1 10" stroke="#9db7bb" stroke-width="1"/><path d="M32 12V2" stroke="#6a6b56" stroke-width="1.4"/><path d="m33 3 10 3-10 4Z" fill="#517fa1"/><path d="M26 36v-6m13-5v-4" stroke="#1d3746" stroke-width="2"/><path d="M24 14q7-7 14 0m-14 0 14 0" stroke="#d5b87b" stroke-width="1" fill="none"/>`;
 } else if (kind === 'cannon') {
  tower = `${masonry}<path d="m16 34 16-7 16 7v7l-16 7-16-7Z" fill="#869185"/><path d="m16 34 16-7 16 7-16 7Z" fill="#bdbaa0"/><path d="m23 33 10-12 9 3 3 11-14 5Z" fill="#495f66"/><circle cx="22" cy="34" r="6" fill="#263b47"/><circle cx="22" cy="34" r="3.8" fill="#b29962"/><path d="m19 35 20-24 12 9-20 23Z" fill="#675b41"/><path d="m19 35 20-24 6 4-20 24Z" fill="#c5af70"/><path d="m26 30 5 4m1-11 5 4" stroke="#dbca91" stroke-width="2.5"/><ellipse cx="45" cy="16" rx="8.5" ry="6.5" transform="rotate(36 45 16)" fill="#b7a47a"/><ellipse cx="45" cy="16" rx="5.5" ry="4.2" transform="rotate(36 45 16)" fill="#182935"/><path d="M16 52h4m23-3h4" stroke="#cdba86" stroke-width="2"/><circle cx="12" cy="49" r="3" fill="#34434d"/><circle cx="16" cy="46" r="3" fill="#34434d"/>`;
 } else {
  tower = `${masonry}<ellipse cx="32" cy="31" rx="18" ry="9" fill="${tint}" opacity=".12"/><path d="m18 32 14-6 14 6-14 6Z" fill="#b8b3aa"/><path d="m18 32 14 6 14-6v5l-14 6-14-6Z" fill="#736f86"/><path d="m20 35 3-21 4 5-2 18m18-2-3-21-4 5 2 18" fill="${crystal ? '#786a9e' : '#86adbe'}"/><path d="m23 14 2 12m15-12-2 12" stroke="#d8c39b" stroke-width="1.5"/><path d="m32 2 9 14-3 14-6 7-6-7-3-14Z" fill="${crystal ? '#9a64de' : '#55bad6'}"/><path d="m32 2-2 18 2 17-6-7-3-14Z" fill="${crystal ? '#d0abff' : '#b8f0ff'}"/><path d="m32 2 9 14-11 4Z" fill="${crystal ? '#8054c7' : '#4d91b8'}"/><path d="m30 20 8 10-6 7Z" fill="${crystal ? '#7641b2' : '#367ba3'}"/><path d="m32 3-5 13 3 4Z" fill="#f4edff" opacity=".7"/><path d="m18 29 14 6 14-6m-28 4 14 6 14-6" stroke="#d0ae69" fill="none" stroke-width="1.3"/><path d="M32 44v7m-3-4 3-3 3 3-3 3Z" stroke="${tint}" fill="none" stroke-width="1"/>`;
  if (crystal) tower += `<ellipse cx="32" cy="16" rx="18" ry="5.5" fill="none" stroke="#b88dff" stroke-width="1.2" opacity=".8"/><path d="m13 15 2-3 2 3-2 3Zm34 7 2-3 2 3-2 3Z" fill="#dbc0ff"/>`;
  else tower += `<path d="m13 44 3-13 5 9-3 9Zm31 1 5-12 4 12-5 6Z" fill="#9ee3ed"/><path d="m13 44 3-13 1 13Z" fill="#e6fcf7"/>`;
 }
 return `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="33" cy="56" rx="25" ry="7" fill="#020913" opacity=".55"/>${walls}${tower}<path d="m15 54 5-1m26 2 5-2" stroke="#a4a27c" stroke-width="1" opacity=".7"/></svg>`;
}
