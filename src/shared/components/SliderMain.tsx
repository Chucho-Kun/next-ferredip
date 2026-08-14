'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';


export default function SliderMain() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex pb-5 cursor-grab">
        <div className="flex-[0_0_100%] min-w-0">
          <img src="/sliders/mainSlider/1.webp" alt="Expo Ferretera" className="slider-responsive" fetchPriority='high' />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/2.webp" alt="Entregamos desde una pieza hasta una obra completa" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/3.webp" alt="Tienes una lista de materiales, cotiza con nosotros" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/4.webp" alt="Productos Panel Rey" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/5.webp" alt="Productos Gyproc" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/6.webp" alt="Plafones y todo para su instalación" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/7.webp" alt="Productos Grambel" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/8.webp" alt="Productos Pennsylvania" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/9.webp" alt="Productos Fisher" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/10.webp" alt="Somos fabricantes de perfiles para muros y plafones" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/11.webp" alt="Productos glasliner y mejora de diseños" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/12.webp" alt="Productos Cempanel" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/13.webp" alt="Productos Mapei" className="slider-responsive" />
        </div>
      </div>
    </div>
  );
}