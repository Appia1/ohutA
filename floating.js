
  const floating = document.getElementById("floatingImage");
  let isDragging = false;
  let offsetX, offsetY;

  floating.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - floating.getBoundingClientRect().left;
    offsetY = e.clientY - floating.getBoundingClientRect().top;
    floating.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    floating.style.left = x + "px";
    floating.style.top = y + "px";
    floating.style.bottom = "auto";
    floating.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    floating.style.transition = "transform 0.2s ease";
  });

  // For touch devices
  floating.addEventListener("touchstart", (e) => {
    isDragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - floating.getBoundingClientRect().left;
    offsetY = touch.clientY - floating.getBoundingClientRect().top;
    floating.style.transition = "none";
  });

  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    let x = touch.clientX - offsetX;
    let y = touch.clientY - offsetY;
    floating.style.left = x + "px";
    floating.style.top = y + "px";
    floating.style.bottom = "auto";
    floating.style.right = "auto";
  });

  document.addEventListener("touchend", () => {
    isDragging = false;
    floating.style.transition = "transform 0.2s ease";
  });
