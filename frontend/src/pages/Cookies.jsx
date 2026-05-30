import { useT } from '../i18n/I18nContext.jsx';
import LegalPage, { LegalSection, LegalParagraph, LegalList } from '../components/LegalPage.jsx';

const CONTACT_EMAIL = 'info@bookbridge.ge';

export default function Cookies() {
  const { t } = useT();

  return (
    <LegalPage titleKey="legal.cookiesTitle" introKey="cookies.intro">
      <LegalSection heading={t('cookies.whatHeading')}>
        <LegalParagraph>{t('cookies.whatBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('cookies.essentialHeading')}>
        <LegalParagraph>{t('cookies.essentialBody')}</LegalParagraph>
        <LegalList
          items={[
            'Authentication — to keep you signed in as you move between pages.',
            'Security (CSRF) — to protect forms and requests from cross-site attacks.',
            'Preferences — to remember your chosen language.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('cookies.noTrackingHeading')}>
        <LegalParagraph>{t('cookies.noTrackingBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('cookies.controlHeading')}>
        <LegalParagraph>{t('cookies.controlBody')}</LegalParagraph>
        <LegalList
          items={[
            'Most browsers let you view, block, and delete cookies in their settings.',
            'Blocking essential cookies may stop you from signing in or completing a donation.',
            'Signing out clears your session cookie.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('cookies.contactHeading')}>
        <LegalParagraph>
          {t('cookies.contactBody')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
