import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
 
interface KycApprovedTemplateProps {
  firstName: string;
  orgName:   string;
}
 
export function KycApprovedTemplate({ firstName, orgName }: KycApprovedTemplateProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://iwacumo.com";
 
  return (
    <Html><Head />
      <Preview>Your KYC is approved — welcome to iwacumo!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}><Heading style={logo}>IWACUMO.</Heading></Section>
          <Section style={content}>
            <Heading style={h1}>You&apos;re Verified.</Heading>
            <Text style={greeting}>Hey {firstName},</Text>
            <Text style={paragraph}>
              Great news — your KYC verification for <strong>{orgName}</strong> has been
              approved. Your publisher account is now fully active.
            </Text>
            <Text style={paragraph}>
              You can now publish books, manage your storefront, and start earning.
            </Text>
            <Section style={buttonContainer}>
              <Button href={`${appUrl}/app`} style={button}>
                GO TO MY DASHBOARD
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              If you have any questions, reply to this email and our team will help.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
 
const body: React.CSSProperties        = { backgroundColor: "#FAF9F6", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" };
const container: React.CSSProperties  = { margin: "0 auto", padding: "20px 0 48px", width: "560px", maxWidth: "100%" };
const header: React.CSSProperties     = { backgroundColor: "#000000", padding: "24px 40px" };
const logo: React.CSSProperties       = { color: "#FFD700", fontSize: "28px", fontWeight: "900", fontStyle: "italic", letterSpacing: "-1px", margin: "0" };
const content: React.CSSProperties    = { backgroundColor: "#ffffff", border: "2px solid #000000", padding: "40px" };
const h1: React.CSSProperties         = { color: "#0A0A0A", fontSize: "28px", fontWeight: "900", textTransform: "uppercase", fontStyle: "italic", margin: "0 0 24px" };
const greeting: React.CSSProperties   = { color: "#0A0A0A", fontSize: "16px", fontWeight: "700", margin: "0 0 8px" };
const paragraph: React.CSSProperties  = { color: "#444444", fontSize: "15px", lineHeight: "1.6", margin: "0 0 16px" };
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "32px 0" };
const button: React.CSSProperties     = { backgroundColor: "#FFD700", border: "2px solid #000000", color: "#000000", display: "inline-block", fontSize: "13px", fontWeight: "900", letterSpacing: "2px", padding: "16px 40px", textDecoration: "none", textTransform: "uppercase" };
const hr: React.CSSProperties         = { border: "none", borderTop: "1px solid #E5E5E5", margin: "32px 0" };
const footer: React.CSSProperties     = { color: "#999999", fontSize: "12px", lineHeight: "1.5" };
 