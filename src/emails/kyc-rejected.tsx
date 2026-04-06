import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
 
interface KycRejectedTemplateProps {
  firstName:     string;
  orgName:       string;
  reviewerNotes: string | null;
}
 
export function KycRejectedTemplate({ firstName, orgName, reviewerNotes }: KycRejectedTemplateProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://iwacumo.com";
 
  return (
    <Html><Head />
      <Preview>Action required: your KYC submission needs attention</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}><Heading style={logo}>IWACUMO.</Heading></Section>
          <Section style={content}>
            <Heading style={h1}>KYC Not Approved</Heading>
            <Text style={greeting}>Hey {firstName},</Text>
            <Text style={paragraph}>
              Unfortunately, your KYC verification for <strong>{orgName}</strong> was
              not approved at this time. You can review the feedback below and resubmit
              with the correct documents.
            </Text>
 
            {reviewerNotes && (
              <div style={notesBox}>
                <Text style={notesLabel}>Reviewer Feedback</Text>
                <Text style={notesText}>{reviewerNotes}</Text>
              </div>
            )}
 
            <Text style={paragraph}>
              Please correct the issues above and resubmit your documents. Our team
              will review your updated submission as soon as possible.
            </Text>
 
            <Section style={buttonContainer}>
              <Button href={`${appUrl}/app/kyc`} style={button}>
                RESUBMIT MY KYC
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              If you believe this is an error or need help, reply to this email.
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
const notesBox: React.CSSProperties   = { backgroundColor: "#FFF8E1", border: "1px solid #FFD700", padding: "16px", margin: "0 0 24px" };
const notesLabel: React.CSSProperties = { color: "#555", fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 8px" };
const notesText: React.CSSProperties  = { color: "#333", fontSize: "14px", lineHeight: "1.6", margin: "0" };
const buttonContainer: React.CSSProperties = { textAlign: "center", margin: "32px 0" };
const button: React.CSSProperties     = { backgroundColor: "#FFD700", border: "2px solid #000000", color: "#000000", display: "inline-block", fontSize: "13px", fontWeight: "900", letterSpacing: "2px", padding: "16px 40px", textDecoration: "none", textTransform: "uppercase" };
const hr: React.CSSProperties         = { border: "none", borderTop: "1px solid #E5E5E5", margin: "32px 0" };
const footer: React.CSSProperties     = { color: "#999999", fontSize: "12px", lineHeight: "1.5" };
 