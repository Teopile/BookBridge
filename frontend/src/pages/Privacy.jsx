import { useT } from '../i18n/I18nContext.jsx';
import LegalPage, { LegalSection, LegalParagraph, LegalList } from '../components/LegalPage.jsx';

const CONTACT_EMAIL = 'info@bookbridge.ge';

export default function Privacy() {
  const { t } = useT();

  return (
    <LegalPage titleKey="legal.privacyTitle" introKey="privacy.intro">
      <LegalSection heading={t('privacy.collectHeading')}>
        <LegalParagraph>{t('privacy.collectBody')}</LegalParagraph>
        <LegalList
          items={[
            'Account details: your name (or username) and email address.',
            'Donation records: the schools you support, the books you pledge, and delivery status.',
            'Delivery information: an optional pickup or postal address when you ask us to arrange a courier.',
            'Contact messages: anything you send us by email or through a form.',
            'Basic technical data: the language you use the site in and security tokens needed to keep you signed in.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('privacy.whyHeading')}>
        <LegalParagraph>{t('privacy.whyBody')}</LegalParagraph>
        <LegalList
          items={[
            'To create and secure your account.',
            'To record and deliver your book donations to the right school.',
            'To arrange courier pickup when you request it.',
            'To send transactional email — for example sign-in codes, password resets, and donation status updates.',
            'To respond to your questions and support requests.',
            'To keep BookBridge safe and prevent abuse.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('privacy.legalBasisHeading')}>
        <LegalParagraph>{t('privacy.legalBasisBody')}</LegalParagraph>
        <LegalList
          items={[
            'Performance of a service you asked for — for example processing a donation you started.',
            'Your consent — for example when you give us an address for courier pickup. You can withdraw consent at any time.',
            'Our legitimate interest in running a safe, working platform — for example security and fraud prevention.',
            'Compliance with the law — for example keeping records we are legally required to keep.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('privacy.storageHeading')}>
        <LegalParagraph>{t('privacy.storageBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.thirdPartiesHeading')}>
        <LegalParagraph>{t('privacy.thirdPartiesBody')}</LegalParagraph>
        <LegalList
          items={[
            'Supabase — database, authentication, and file storage.',
            'Vercel — website and API hosting.',
            'Our email provider — to send transactional email such as sign-in codes and status updates.',
            'A payment provider — only if and when monetary donations are enabled; card details are handled by the provider, not stored by us.',
          ]}
        />
        <LegalParagraph>{t('privacy.thirdPartiesNote')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.retentionHeading')}>
        <LegalParagraph>{t('privacy.retentionBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('privacy.rightsHeading')}>
        <LegalParagraph>{t('privacy.rightsBody')}</LegalParagraph>
        <LegalList
          items={[
            'Access — ask for a copy of the personal data we hold about you.',
            'Correction — ask us to fix data that is wrong or out of date.',
            'Deletion — ask us to delete your account and personal data, subject to records we must keep by law.',
            'Objection and restriction — ask us to stop or limit certain uses of your data.',
            'Withdraw consent — where we rely on your consent, you can withdraw it at any time.',
          ]}
        />
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
