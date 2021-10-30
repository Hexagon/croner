/*!
* Collapsible.js v1.2.0
* https://github.com/jordnkr/collapsible
*
* Copyright 2017, Jordan Ruedy
* This content is released under the MIT license
* http://opensource.org/licenses/MIT
*/
!function(e,s){e.fn.collapsible=function(s){var n={accordion:!1,accordionUpSpeed:400,accordionDownSpeed:400,collapseSpeed:400,contentOpen:null,arrowRclass:"arrow-r",arrowDclass:"arrow-d",animate:!0},c=e.extend(n,s);return this.each(function(){!1===c.animate&&(c.accordionUpSpeed=0,c.accordionDownSpeed=0,c.collapseSpeed=0);var s=e(this).children(":even"),n=e(this).children(":odd"),r="accordion-active";if(e(this).children(":nth-child(even)").css("display","none"),!0===c.accordion)null!==c.contentOpen&&(e(s[c.contentOpen]).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass),e(n[c.contentOpen]).show().addClass(r)),e(s).click(function(){e(this).next().attr("class")===r?(e(this).next().slideUp(c.accordionUpSpeed).removeClass(r),e(this).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass)):(e(s).children().removeClass(c.arrowDclass).addClass(c.arrowRclass),e(n).slideUp(c.accordionUpSpeed).removeClass(r),e(this).next().slideDown(c.accordionDownSpeed).addClass(r),e(this).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass))});else{if(null!==c.contentOpen)if(Array.isArray(c.contentOpen))for(var a=0;a<c.contentOpen.length;a++){var l=c.contentOpen[a];e(s[l]).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass),e(n[l]).show()}else e(s[c.contentOpen]).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass),e(n[c.contentOpen]).show();e(s).click(function(){e(this).children(":first-child").toggleClass(c.arrowRclass+" "+c.arrowDclass),e(this).next().slideToggle(c.collapseSpeed)})}})}}(jQuery);
