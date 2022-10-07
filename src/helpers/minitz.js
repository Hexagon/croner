/* ------------------------------------------------------------------------------------

	minitz 4.0.0 - MIT License - Hexagon <hexagon@56k.guru>

	Bundled manually, check https://github.com/Hexagon/minitz for updates

  ------------------------------------------------------------------------------------  */
  function minitz(y,m,d,h,i,s,tz,throwOnInvalid){return minitz.fromTZ(minitz.tp(y,m,d,h,i,s,tz),throwOnInvalid)}minitz.fromTZISO=(localTimeStr,tz,throwOnInvalid)=>{return minitz.fromTZ(parseISOLocal(localTimeStr,tz),throwOnInvalid)};minitz.fromTZ=function(tp,throwOnInvalid){const inDate=new Date(Date.UTC(tp.y,tp.m-1,tp.d,tp.h,tp.i,tp.s)),offset=getTimezoneOffset(tp.tz,inDate),dateGuess=new Date(inDate.getTime()-offset),dateOffsGuess=getTimezoneOffset(tp.tz,dateGuess);if(dateOffsGuess-offset===0){return dateGuess}else{const dateGuess2=new Date(inDate.getTime()-dateOffsGuess),dateOffsGuess2=getTimezoneOffset(tp.tz,dateGuess2);if(dateOffsGuess2-dateOffsGuess===0){return dateGuess2}else if(!throwOnInvalid){return dateGuess}else{throw new Error("Invalid date passed to fromTZ()")}}};minitz.toTZ=function(d,tzStr){const td=new Date(d.toLocaleString("sv-SE",{timeZone:tzStr}));return{y:td.getFullYear(),m:td.getMonth()+1,d:td.getDate(),h:td.getHours(),i:td.getMinutes(),s:td.getSeconds(),tz:tzStr}};minitz.tp=(y,m,d,h,i,s,tz)=>{return{y:y,m:m,d:d,h:h,i:i,s:s,tz:tz}};function getTimezoneOffset(timeZone,date=new Date){const tz=date.toLocaleString("en",{timeZone:timeZone,timeStyle:"long"}).split(" ").slice(-1)[0];const dateString=date.toString();return Date.parse(`${dateString} UTC`)-Date.parse(`${dateString} ${tz}`)}function parseISOLocal(dtStr,tz){const pd=new Date(Date.parse(dtStr));if(isNaN(pd)){throw new Error("minitz: Invalid ISO8601 passed to parser.")}const stringEnd=dtStr.substring(9);if(dtStr.includes("Z")||stringEnd.includes("-")||stringEnd.includes("+")){return minitz.tp(pd.getUTCFullYear(),pd.getUTCMonth()+1,pd.getUTCDate(),pd.getUTCHours(),pd.getUTCMinutes(),pd.getUTCSeconds(),"Etc/UTC")}else{return minitz.tp(pd.getFullYear(),pd.getMonth()+1,pd.getDate(),pd.getHours(),pd.getMinutes(),pd.getSeconds(),tz)}}minitz.minitz=minitz;export{minitz as default,minitz};