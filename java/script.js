//If you want to copyText from Element
function copyTextFromElement(elementID) {
  let element = document.getElementById(elementID); //select the element
  let elementText = element.textContent; //get the text content from the element
  copyText(elementText); //use the copyText function below
}

//If you only want to put some Text in the Clipboard just use this function
// and pass the string to copied as the argument.
function copyText(text) {
  navigator.clipboard.writeText(text);
}

let width = screen.width;
document.getElementById("demo").innerHTML =  width + "px";

document.addEventListener("DOMContentLoaded", function () {

  document.addEventListener('resize',messen);
  messen();

  function messen() {
    document.getElementById('screenW').textContent = screen.width;
    document.getElementById('screenH').textContent = screen.height;
    }

});
screen.width1 = screen.width*3/4
