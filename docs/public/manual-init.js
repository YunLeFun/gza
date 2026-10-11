document.documentElement.classList.add("dark");
document.documentElement.classList.toggle("mac", /Mac|iPhone|iPod|iPad/i.test(navigator.platform));
