const form = document.querySelector("#updateProfileForm");

form.addEventListener("submit", async (e) => {   // fixed typo
    e.preventDefault();

    const name = document.querySelector("#name").value;
    const phone = document.querySelector("#phone").value;
    const address = document.querySelector("#address").value;
    const password = document.querySelector("#password").value;

    const token = localStorage.getItem("token");
    if(!token){
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    let data = {};
    if(name !== undefined) data.name = name;
    if(phone !== undefined) data.phone = phone;
    if(address !== undefined) data.address = address;
    if(password) data.password = password;

    // console.log("Sending data:", data); // debug

    const res = await fetch("http://localhost:6789/api/updateprofile", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    // console.log("Response:", result);  // debug

    if(result.success){
        alert(result.message);
        document.querySelector("#password").value = "";
        
    } else {
        alert(result.message );
    }
});
