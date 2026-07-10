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
          <img src="/sliders/mainSlider/1.webp" alt="Dipemsa web" className="slider-responsive" fetchPriority='high' />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/1b.webp" alt="Mayoristas o constructores" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/2.webp" alt="Contamos con toda la linea Panel Rey" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/3.webp" alt="Plafones y suspensiones" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/4.webp" alt="Grambel Sistemas de Fijación" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/A2.webp" alt="Sellado con productos Pennsylvania" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/AR1.webp" alt="Plafones y suspension Armstrong" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/AR3.webp" alt="Venta de productos Dipemsa" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/AR4.webp" alt="Glass liner y liner panel disponibles" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/AR5.webp" alt="Plafones y suspensiones de todas las marcas" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/basecoat.webp" alt="Productos USG basecoat, durok, redimix" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/mapei.webp" alt="Adhesivos y nivelantes Mapei" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/plasticos.webp" alt="Perfiles plasticos trim-tex" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/sliderA.webp" alt="Cita tapagoteras duretan de productos pennsylvania" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/sliderB.webp" alt="Todos los productos de la marca Fischer" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/sliderC.webp" alt="productos cempanel para aplicaciones arquitectonicas" className="slider-responsive" />
        </div>
      </div>
    </div>
  );
}