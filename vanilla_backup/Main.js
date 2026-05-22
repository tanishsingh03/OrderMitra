const OrderBtn=document.querySelector('#orderbtn')
const browseBtn=document.querySelector("#browsebtn")
const getStarted=document.querySelector(".btn-getstarted")
OrderBtn.addEventListener('click',()=>{
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
}
if (token.role === "customer") {
  window.location.href = "CustomerDashboard.html";
} 
else if (token.role === "restaurant-owner") {
  window.location.href = "RestaurantDashboard.html";
} 
else {
  window.location.href = "login.html";
}
})
browseBtn.addEventListener('click',()=>{
  window.location.href="CustomerDashboard.html"
})
getStarted.addEventListener('click',()=>{
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
}
if (token.role === "customer") {
  window.location.href = "CustomerDashboard.html";
} 
else if (token.role === "restaurant-owner") {
  window.location.href = "RestaurantDashboard.html";
} 
else {
  window.location.href = "login.html";
}
})