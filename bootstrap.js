/**
 * PROFESSIONAL PORTFOLIO INTERACTIVE LOGIC
 */

$(document).ready(function() {
    // 1. SMOOTH SCROLLING
    $('a.nav-link').on('click', function(event) {
        if (this.hash !== "") {
            event.preventDefault();
            var hash = this.hash;
            $('html, body').animate({
                scrollTop: $(hash).offset().top - 70
            }, 800);
        }
    });

    // 2. NAV SCROLL EFFECT
    $(window).scroll(function() {
        if ($(window).scrollTop() > 50) {
            $('.navbar-custom').addClass('navbar-shadow');
        } else {
            $('.navbar-custom').removeClass('navbar-shadow');
        }
    });

    // 3. TOOLTIP & POPOVER INITIALIZATION
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    // 4. DYNAMIC MODAL CONTENT
    $('.view-project-btn').on('click', function() {
        const title = $(this).data('title');
        const desc = $(this).data('desc');
        const img = $(this).data('img');

        $('#projectModalLabel').text(title);
        $('#projectModalBody').html(`
            <img src="${img}" class="img-fluid rounded mb-3" alt="${title}">
            <p>${desc}</p>
        `);
        
        const myModal = new bootstrap.Modal(document.getElementById('projectModal'));
        myModal.show();
    });

    // 5. FORM VALIDATION
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // 6. SHOW/HIDE JQUERY EXAMPLE
    $('#toggleExperience').on('click', function() {
        $('.extra-experience').slideToggle(300);
        $(this).text($(this).text() === 'View More' ? 'View Less' : 'View More');
    });

    // 7. TYPING ANIMATION SIMULATION
    const leadText = "Building digital experiences that matter.";
    let i = 0;
    const speed = 50;

    function typeWriter() {
        if (i < leadText.length) {
            $('#typing-lead').append(leadText.charAt(i));
            i++;
            setTimeout(typeWriter, speed);
        }
    }
    typeWriter();
});
