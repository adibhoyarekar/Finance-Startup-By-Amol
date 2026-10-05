const cardAnimation = document.getElementById('credit-card-animation');
if (cardAnimation && window.lottie) {
  window.lottie.loadAnimation({
    container: cardAnimation,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'credit-card.json'
  });
}
