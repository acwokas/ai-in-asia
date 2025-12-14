import { trackAnalyticsEvent } from './useAnalyticsTracking';

export type SponsorPlacement = 
  | 'prompt_and_go_banner'
  | 'prompt_and_go_sidebar'
  | 'business_in_a_byte_mpu'
  | 'perplexity_comet_homepage'
  | 'perplexity_comet_tools'
  | 'category_sponsor'
  | 'newsletter_sponsor'
  | 'google_ad_sidebar'
  | 'google_ad_in_article'
  | 'google_ad_footer'
  | 'google_ad_mpu';

export const trackSponsorClick = (
  placement: SponsorPlacement,
  sponsorName: string,
  destinationUrl: string,
  additionalData?: Record<string, unknown>
) => {
  trackAnalyticsEvent('sponsor_click', 'sponsorship', {
    placement,
    sponsor_name: sponsorName,
    destination_url: destinationUrl,
    page_url: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

export const trackSponsorImpression = (
  placement: SponsorPlacement,
  sponsorName: string,
  additionalData?: Record<string, unknown>
) => {
  trackAnalyticsEvent('sponsor_impression', 'sponsorship', {
    placement,
    sponsor_name: sponsorName,
    page_url: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};
