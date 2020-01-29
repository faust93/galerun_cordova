function loadImage (el) {
        var src = el.getAttribute('data-src');
        el.onload = function() {
            el.classList.toggle("g-img");
            finishLoadingImage(el);
        }
        el.src = src;
}

function loadImages(num) {
        var no_images_load = num;
        var images = $(".unloaded");

        if(images.length == 0 || loading_images > 0) {
            return;
        }

        loading_images_started = true
        gimgLoading.toggle();

        if(images.length < no_images_load){
            no_images_load = images.length;
        }
        for (i = 0; i < no_images_load ; i++) {
            loading_images += 1;
            loadImage(images[i])
        }
}

function failedLoadingImage (el) {
	console.log("Error loading image");
	el.classList.remove("unloaded");
	el.classList.add("failed");
	loading_images -= 1;
	if (loading_images < 1) {
		finishLoadingImages();
	}
}

function finishLoadingImage (el) {
	el.classList.remove("unloaded");
	loading_images -= 1;
	if (loading_images < 1) {
		finishLoadingImages();
	}
}

function finishLoadingImages () {
        console.log("Finished Loading Images");
        loading_images_started = false;
        gimgLoading.hide();
}

var loading_images_started = false;
var loading_images = 0;

