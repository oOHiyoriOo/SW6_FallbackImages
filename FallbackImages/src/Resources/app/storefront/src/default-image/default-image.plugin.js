import Plugin from 'src/plugin-system/plugin.class';
import HttpClient from 'src/service/http-client.service';

export default class DefaultImage extends Plugin {

    init() {

        if(!window.emzImageDefaultQueueRunning){
            this._randomImageSrc();
            window.emzImageDefaultQueueRunning = true;
        }

        window.emzImageDefaultQueue = [];

        window.emzImageCache = JSON.parse( localStorage.getItem('emzFallbackImages') || "{}" );
        
        this.imageKey = this.el.src.split('/')
        this.imageKey = this.imageKey[ this.imageKey.length - 1 ];
        
        this.cachedImage = (this.imageKey in window.emzImageCache) ? window.emzImageCache[ this.imageKey ] : "";
        this.errorHandled = false;

        this.el.addEventListener('error', this._errorHandler.bind(this));

        this.interval = setInterval(() => {
            // check if the image is done trying, error is handled and if it was loaded succesfully.
            if (this.el.complete && !this.errorHandled && this.el.naturalHeight === 0) {
                window.emzImageDefaultQueue.push(this)
                clearInterval(this.interval);

            // stop interval if image is handled.
            }else if( this.el.complete && (this.errorHandled || this.el.naturalHeight !== 0) ){
                clearInterval(this.interval);
            }
        }, 1000);
    }

    _errorHandler() {
        this.errorHandled = true;
        clearInterval(this.interval);

        if(this.cachedImage != ""){
            if( (this.el.src).includes("https://cdn.nekosapi.com/") ){
                this.el.src = "";
                this.cachedImage = "";
                window.emzImageDefaultQueue.push(this)
            }else{
                this.el.removeAttribute('srcset');
                this.el.src = this.cachedImage;
            }
        }else{
            window.emzImageDefaultQueue.push(this)
        }
    }

    _randomImageSrc(){
        const httpClient = new HttpClient();
        window.emzQueueWorkerIdle = 0;

        // Process one item per second
        window.emzQueueWorker = setInterval(() => {
            // Check if there are items in the queue
            if (window.emzImageDefaultQueue.length > 0) {
                // Remove the first item from the queue and process it
                const img = window.emzImageDefaultQueue.shift();
                
                if(img.cachedImage != ""){
                    img.el.removeAttribute('srcset');
                    img.el.src = img.cachedImage;
                } else {
                    httpClient.get(
                        'https://api.nekosapi.com/v2/images/random?filter[ageRating.in]=sfw',
                        (response) => {
                            try {
                                const data = JSON.parse(response);
                                
                                let rImg = data['data']['attributes']['file'];
                                let rating = data['data']['attributes']['ageRating'];

                                if (rating != "sfw"){
                                    window.emzImageDefaultQueue.push(img);
                                }else{
                                    
                                    if( !(img.el.src).includes("https://cdn.nekosapi.com/") ){
                                        console.log( `Replaced: ${img.el.src} with ${rImg}` );
                                        window.emzImageCache[ img.imageKey ] = rImg;
                                        localStorage.setItem('emzFallbackImages', JSON.stringify( window.emzImageCache ));
                                        img.el.removeAttribute('srcset');
                                        img.el.src = rImg;
                                    }
                                }
                                
                            } catch (e) {
                                console.error('Error parsing response:', e);
                            }
                        }
                    );
                }
            } else {
                localStorage.setItem('emzFallbackImages', JSON.stringify( window.emzImageCache ));
                
                if( window.emzQueueWorkerIdle >= 10 ){
                    console.log( "Fallback Images finished!" )
                    clearInterval(window.emzQueueWorker);
                }else{ window.emzQueueWorkerIdle++ }
            }
        }, 1000);
    }
}