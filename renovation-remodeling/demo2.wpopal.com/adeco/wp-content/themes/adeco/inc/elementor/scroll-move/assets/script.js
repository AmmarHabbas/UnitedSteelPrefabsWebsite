(function ($) {
    'use strict';

    var AdecoScrollMove = {
        items: [],
        dirty: false,

        isDeviceActive: function (devices) {
            if (!devices || devices.length === 0) return true;
            var currentDevice = elementorFrontend.getCurrentDeviceMode();
            return devices.indexOf(currentDevice) !== -1;
        },

        collectItems: function () {
            var self = this;
            self.items = [];

            $('[data-adeco-scroll-move]').each(function () {
                var el       = this;
                var settings = $(el).data('adeco-scroll-move');
                if (!settings) return;

                var prop = (settings.unit === '%') ? 'yPercent' : 'y';

                gsap.set(el, { willChange: 'transform', transformStyle: 'preserve-3d' });

                self.items.push({ el: el, settings: settings, prop: prop });
            });
        },

        calcTarget: function (item) {
            var rect = item.el.getBoundingClientRect();
            var vh   = window.innerHeight;
            var s    = item.settings;

            // Raw progress: 0% = element top at viewport bottom, 100% = element top at viewport top
            var rawProgress = (vh - rect.top) / vh * 100;
            rawProgress = Math.max(0, Math.min(100, rawProgress));

            var rangeStart = s.affectedRange ? s.affectedRange.start : 0;
            var rangeEnd   = s.affectedRange ? s.affectedRange.end   : 100;

            var progress;
            if (rangeStart === rangeEnd) {
                progress = 0;
            } else {
                var clamped = Math.max(rangeStart, Math.min(rangeEnd, rawProgress));
                progress    = (clamped - rangeStart) / (rangeEnd - rangeStart);
            }

            return s.direction === 'up'
                ? -(progress * s.amount)
                :  (progress * s.amount);
        },

        update: function () {
            var self = this;

            self.items.forEach(function (item) {
                var props = {};

                if (!self.isDeviceActive(item.settings.devices)) {
                    props[item.prop] = 0;
                    gsap.set(item.el, props);
                    return;
                }

                props[item.prop] = self.calcTarget(item);
                gsap.set(item.el, props);
            });
        }
    };

    // GSAP ticker: runs every frame (RAF-synced at 60fps)
    // Only calls update() when scroll has changed — avoids wasted frames
    function onTick() {
        if (!AdecoScrollMove.dirty) return;
        AdecoScrollMove.dirty = false;
        AdecoScrollMove.update();
    }

    function onScroll() {
        AdecoScrollMove.dirty = true;
    }

    var resizeTimer = null;

    function onResize() {
        // Snap immediately during resize
        AdecoScrollMove.items.forEach(function (item) {
            var props = {};
            if (!AdecoScrollMove.isDeviceActive(item.settings.devices)) {
                props[item.prop] = 0;
            } else {
                props[item.prop] = AdecoScrollMove.calcTarget(item);
            }
            gsap.set(item.el, props);
        });

        // Re-init after resize settles
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            initScrollMove();
        }, 200);
    }

    function initScrollMove() {
        AdecoScrollMove.collectItems();

        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        gsap.ticker.remove(onTick);

        if (AdecoScrollMove.items.length === 0) return;

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        gsap.ticker.add(onTick);

        AdecoScrollMove.update();
    }

    $(document).ready(function () {
        initScrollMove();
    });

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/container.default', function () {
            initScrollMove();
        });
        elementorFrontend.hooks.addAction('frontend/element_ready/section.default', function () {
            initScrollMove();
        });
    });

})(jQuery);
