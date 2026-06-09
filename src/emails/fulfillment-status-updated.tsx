import {
  Body, Button, Container, Head, Heading,
  Hr, Html, Preview, Section, Text,
} from "@react-email/components";

interface FulfillmentStatusUpdatedTemplateProps {
  firstName: string;
  orderNumber: string;
  bookTitle: string;
  fulfillmentStatusLabel: string;
  statusMessage: string;
  dashboardUrl: string;
}

export function FulfillmentStatusUpdatedTemplate({
  firstName,
  orderNumber,
  bookTitle,
  fulfillmentStatusLabel,
  statusMessage,
  dashboardUrl,
}: FulfillmentStatusUpdatedTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{bookTitle} is now {fulfillmentStatusLabel}.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IWACUMO.</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Fulfillment Update<span style={{ color: "#FFD700" }}>.</span></Heading>

            <Text style={paragraph}>
              Hey <strong>{firstName}</strong>, the fulfillment status for
              {" "}<strong>{bookTitle}</strong> has changed.
            </Text>

            <Section style={statusBox}>
              <Text style={statusLabel}>ORDER</Text>
              <Text style={statusValue}>{orderNumber}</Text>
              <Hr style={thinHr} />
              <Text style={statusLabel}>CURRENT STATUS</Text>
              <Text style={statusValue}>{fulfillmentStatusLabel}</Text>
            </Section>

            <Text style={paragraph}>{statusMessage}</Text>

            <Section style={buttonContainer}>
              <Button href={dashboardUrl} style={button}>
                OPEN MY LIBRARY
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Questions? Reply to this email or visit our support page.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#FAF9F6",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto", padding: "20px 0 48px", width: "560px", maxWidth: "100%",
};
const header: React.CSSProperties = {
  backgroundColor: "#000000", padding: "24px 40px",
};
const logo: React.CSSProperties = {
  color: "#FFD700", fontSize: "28px", fontWeight: "900",
  fontStyle: "italic", letterSpacing: "-1px", margin: "0",
};
const content: React.CSSProperties = {
  backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px",
};
const h1: React.CSSProperties = {
  color: "#0A0A0A", fontSize: "32px", fontWeight: "900",
  fontStyle: "italic", textTransform: "uppercase", margin: "0 0 16px",
};
const paragraph: React.CSSProperties = {
  color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px",
};
const statusBox: React.CSSProperties = {
  backgroundColor: "#FAF9F6", border: "1px solid #E5E5E5",
  padding: "16px", margin: "16px 0",
};
const statusLabel: React.CSSProperties = {
  color: "#999", fontSize: "9px", fontWeight: "900",
  textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 4px",
};
const statusValue: React.CSSProperties = {
  color: "#000", fontSize: "16px", fontWeight: "900",
  textTransform: "uppercase", margin: "0",
};
const thinHr: React.CSSProperties = {
  border: "none", borderTop: "1px solid #E5E5E5", margin: "14px 0",
};
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "28px 0" };
const button: React.CSSProperties = {
  backgroundColor: "#000000", color: "#FFD700", padding: "14px 28px",
  fontSize: "13px", fontWeight: "900", textDecoration: "none",
  borderRadius: "0", textTransform: "uppercase", fontStyle: "italic",
};
const hr: React.CSSProperties = {
  border: "none", borderTop: "2px solid #000000", margin: "24px 0",
};
const footer: React.CSSProperties = {
  color: "#999999", fontSize: "11px", lineHeight: "1.5", margin: "0",
};
