import assert from 'node:assert/strict';
import {relativeTime} from './relativeTime.js';
const now=Date.parse('2026-10-27T00:00:00Z');
const ago=seconds=>new Date(now-seconds*1000).toISOString();
for(const [seconds,expected] of [[0,'just now'],[59,'just now'],[60,'1 minute ago'],[120,'2 minutes ago'],[3600,'1 hour ago'],[7200,'2 hours ago'],[86400,'1 day ago'],[172800,'2 days ago'],[604800,'1 week ago'],[1209600,'2 weeks ago'],[31536000,'1 year ago']])assert.equal(relativeTime(ago(seconds),now),expected);
assert.equal(relativeTime(null,now),'not recorded');assert.equal(relativeTime('bad',now),'not recorded');
assert.equal(relativeTime(ago(-60),now),'just now');
console.log('Relative update labels: minutes, hours, days, weeks and missing timestamps passed');
