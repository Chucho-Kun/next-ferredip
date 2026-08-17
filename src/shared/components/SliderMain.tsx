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
          <img src="/sliders/mainSlider/1.webp" alt="productos Truper" className="slider-responsive" fetchPriority='high' />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/2.webp" alt="productos Pretul" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/3.webp" alt="productos Fiero" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/4.webp" alt="productos Foset" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/5.webp" alt="productos Hermex" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/6.webp" alt="productos Volteck" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/7.webp" alt="productos Klintek" className="slider-responsive" />
        </div>
        <div className="flex-[0_0_100%] min-w-0">
          <img loading="lazy" src="/sliders/mainSlider/8.webp" alt="productos Truper Expert" className="slider-responsive" />
        </div>
      </div>
    </div>
  );
}