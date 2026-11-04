// Official Vector bootstrap, copied verbatim from the Partner API page.
!function(e,r){try{if(e.vector)return void console.log("Vector snippet included more than once.");var t={};t.q=t.q||[];for(var o=["load","identify","on"],n=function(e){return function(){var r=Array.prototype.slice.call(arguments);t.q.push([e,r])}},c=0;c<o.length;c++){var a=o[c];t[a]=n(a)}if(e.vector=t,!t.loaded){var i=r.createElement("script");i.type="text/javascript",i.async=!0,i.src="https://cdn.vector.co/pixel.js";var l=r.getElementsByTagName("script")[0];l.parentNode.insertBefore(i,l),t.loaded=!0}}catch(e){console.error("Error loading Vector:",e)}}(window,document);

var POC_BASE = '/vector-poc';
var POC_PIXEL = '228a779f-a23c-4c3b-8030-d355b41eba8a';
var POC_RECORDER = 'https://fancy-foxhound-happy.ngrok-free.app/truth';
var POC_IN_WS2 = location.pathname.indexOf(POC_BASE + '/ws2') === 0;

window.vector.partnerId = POC_IN_WS2 ? 'poc-ws-2' : 'poc-ws-1';
vector.load(POC_PIXEL);

function pocVisitorId() {
  try {
    return localStorage.getItem('vector_visitor_id') || localStorage.getItem('visitor_id') || null;
  } catch (e) {
    return null;
  }
}

// Our own log of what happened and when, to line up against Vector's webhooks. Never includes the email.
function pocLog(event, extra) {
  var entry = Object.assign({ event: event, at: new Date().toISOString(), url: location.href, title: document.title, partnerId: window.vector.partnerId, visitorId: pocVisitorId() }, extra || {});
  navigator.sendBeacon(POC_RECORDER, JSON.stringify(entry));
}

function pocReportVisit(previousUrl) {
  var visitorId = pocVisitorId();
  if (!visitorId) {
    pocLog('manual_activity_skipped', { reason: 'no visitor id yet' });
    return;
  }
  fetch('https://api.vector.co/pixel/' + POC_PIXEL + '/visitor-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: visitorId, url: location.href, title: document.title, referrer: previousUrl }),
  }).then(function (r) {
    pocLog('manual_activity_sent', { status: r.status });
  }).catch(function (e) {
    pocLog('manual_activity_failed', { error: String(e) });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var root = POC_IN_WS2 ? POC_BASE + '/ws2' : POC_BASE;
  var links = [['Home', '/'], ['Features', '/features/'], ['Pricing', '/pricing/'], ['Contact', '/contact/']];
  if (POC_IN_WS2) links.splice(1, 1);
  else links.push(['App', '/app/']);
  var header = document.createElement('header');
  header.innerHTML = '<p class="note">Test site for a Clarify experiment. It runs the Vector tracking pixel, which identifies visitors and reads email addresses from forms. Workspace: <b>' + window.vector.partnerId + '</b></p><nav>' + links.map(function (l) { return '<a href="' + root + l[1] + '">' + l[0] + '</a>'; }).join('') + '</nav>';
  document.body.prepend(header);
  pocLog('page_load', { referrer: document.referrer });

  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-poc-click]');
    if (el) pocLog('click', { target: el.getAttribute('data-poc-click') });
  });

  var form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      pocLog('form_submitted');
      form.innerHTML = '<p>Thanks, that is all for this step.</p>';
    });
  }

  document.querySelectorAll('[data-route]').forEach(function (button) {
    button.addEventListener('click', function () {
      var previousUrl = location.href;
      var route = button.getAttribute('data-route');
      var mode = button.getAttribute('data-mode');
      history.pushState({}, '', POC_BASE + '/app/' + route);
      document.title = button.textContent + ' - Vector POC';
      document.querySelector('#route').textContent = 'You are on: ' + button.textContent;
      pocLog('route_change', { mode: mode });
      if (mode === 'manual') pocReportVisit(previousUrl);
      if (mode === 'page-call' && window.vector.page) window.vector.page();
    });
  });
});
