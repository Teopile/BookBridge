import { useT } from '../i18n/I18nContext.jsx';
import LegalPage, { LegalSection, LegalParagraph, LegalList } from '../components/LegalPage.jsx';

const CONTACT_EMAIL = 'info@bookbridge.ge';

export default function Privacy() {
  const { t } = useT();

  return (
    <LegalPage titleKey="legal.privacyTitle" introKey="privacy.intro">
      <LegalSection heading={t('privacy.collectHeading')}>
        <LegalParagraph>{t('privacy.collectBody')}</LegalParagraph>
        <LegalList items={t('privacy.collectItems')} />
      </LegalSection>

      <LegalSection heading={t('privacy.whyHeading')}>
        <LegalParagraph>{t('privacy.whyBody')}</LegalParagraph>
        <LegalList items={t('privacy.whyItems')} />
      </LegalSection>

      <LegalSection heading={t('privacy.legalBasisHeading')}>
        <LegalParagraph>{t('privacy.legalBasisBody')}</LegalParagraph>
        <LegalList items={t('privacy.legalBasisItems')} />
      </LegalSection>

      <LegalSection heading={t('privacy.storageHeading')}>
        <LegalParagraph>{t('privacy.storageBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.thirdPartiesHeading')}>
        <LegalParagraph>{t('privacy.thirdPartiesBody')}</LegalParagraph>
        <LegalList items={t('privacy.thirdPartiesItems')} />
        <LegalParagraph>{t('privacy.thirdPartiesNote')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.retentionHeading')}>
        <LegalParagraph>{t('privacy.retentionBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.rightsHeading')}>
        <LegalParagraph>{t('privacy.rightsBody')}</LegalParagraph>
        <LegalList items={t('privacy.rightsItems')} />
        <LegalParagraph>{t('privacy.rightsHow', { email: CONTACT_EMAIL })}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.childrenHeading')}>
        <LegalParagraph>{t('privacy.childrenBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.contactHeading')}>
        <LegalParagraph>
          {t('privacy.contactBody')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
