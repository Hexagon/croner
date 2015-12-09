/*

Copyright (c) 2015 Hexagon <robinnilsson@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

'use strict';

var should = require('should'),
	cron = require('../index.js');

/* END OF EXAMPLE DATA */
describe('Parser', function () {

	it('Clean pattern should not throw', function () {
		(function(){
		  var scheduler = cron('* * * * * *');
		}).should.not.throw();
	});
	
	it('Short pattern should throw', function () {
		(function(){
		  var scheduler = cron('* * * * *');
		}).should.throw();
	});
	
	it('Long pattern should throw', function () {
		(function(){
		  var scheduler = cron('* * * * * * *');
		}).should.throw();
	});
	
	it('Letter in pattern should throw', function () {
		(function(){
		  var scheduler = cron('* a * * * *');
		}).should.throw();
	});

	it('Missing lower range should throw', function () {
		(function(){
		  var scheduler = cron('* -9 * * * *');
		}).should.throw();
	});

	it('Missing upper range should throw', function () {
		(function(){
		  var scheduler = cron('* 0- * * * *');
		}).should.throw();
	});

	it('Valid range should not throw', function () {
		(function(){
		  var scheduler = cron('* 0-9 * * * *');
		}).should.not.throw();
	});

	it('Valid seconds should not throw', function () {
		(function(){
		  var scheduler = cron('0-59 * * * * *');
		}).should.not.throw();
	});

	it('Too high second should throw', function () {
		(function(){
		  var scheduler = cron('0-60 * * * * *');
		}).should.throw();
	});

	it('Valid minutes should not throw', function () {
		(function(){
		  var scheduler = cron('* 0-59 * * * *');
		}).should.not.throw();
	});

	it('Too high minute should throw', function () {
		(function(){
		  var scheduler = cron('* 0-5,55,60 * * * *');
		}).should.throw();
	});

	it('Valid hours should not throw', function () {
		(function(){
		  var scheduler = cron('* * 0-23 * * *');
		}).should.not.throw();
	});

	it('Too high hours minute should throw', function () {
		(function(){
		  var scheduler = cron('* * 0,23,24 * * *');
		}).should.throw();
	});

	it('Valid days should not throw', function () {
		(function(){
		  var scheduler = cron('* * * 1-31 * *');
		}).should.not.throw();
	});

	it('Too high days should throw', function () {
		(function(){
		  var scheduler = cron('* * * 32 * *');
		}).should.throw();
	});

	it('Too low days should throw', function () {
		(function(){
		  var scheduler = cron('* * * 0 * *');
		}).should.throw();
	});

	it('Valid months should not throw', function () {
		(function(){
		  var scheduler = cron('* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *');
		}).should.not.throw();
	});

	it('Too high months should throw', function () {
		(function(){
		  var scheduler = cron('* * * * 7-13 *');
		}).should.throw();
	});

	it('Too low months should throw', function () {
		(function(){
		  var scheduler = cron('* * * * 0-3 *');
		}).should.throw();
	});

	it('Valid weekdays should not throw', function () {
		(function(){
		  var scheduler = cron('* * * * * 0,1,2,3,4,5,6,7');
		}).should.not.throw();
	});

	it('Too high weekday should throw', function () {
		(function(){
		  var scheduler = cron('* * * * * 8');
		}).should.throw();
	});

	it('Too low weekday should throw', function () {
		(function(){
		  var scheduler = cron('* * * * * -1');
		}).should.throw();
	});

});