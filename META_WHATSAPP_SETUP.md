# Meta WhatsApp Cloud API Setup

## Prerequisites
1.  **Meta Business Account**: You need a Meta Business Account to use the WhatsApp Cloud API.
2.  **Meta Developer App**: You need to create an App in the Meta Developer Portal.

## Setup Steps

### 1. Create a Meta App
1.  Go to [Meta for Developers](https://developers.facebook.com/).
2.  Click **My Apps** -> **Create App**.
3.  Select **Other** -> **Next**.
4.  Select **Business** -> **Next**.
5.  Enter an App Name (e.g., "DND Purchase Notifications").
6.  Select your Business Account.
7.  Click **Create App**.

### 2. Add WhatsApp Product
1.  In your App Dashboard, scroll down to find **WhatsApp**.
2.  Click **Set up**.
3.  Select your Meta Business Account (if prompted) or continue.

### 3. Get API Credentials
1.  On the **WhatsApp** > **API Setup** page:
    -   **Temporary Access Token**: Use this for initial testing (expires in 24 hours).
    -   **Phone Number ID**: Copy this ID.
    -   **WhatsApp Business Account ID**: Copy this ID.
2.  **Permanent Token**:
    -   Go to **Business Settings** -> **System Users**.
    -   Add a System User (Admin role).
    -   Click **Generate New Token**.
    -   Select your App.
    -   Select Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
    -   Copy the generated Access Token.

### 4. Configure Application
Add the following to your `.env` (or `.env.local`):

```env
META_WHATSAPP_ACCESS_TOKEN=your_access_token_here
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
```

### Important: Testing in Development Mode
If your Meta App is in **Development Mode** (default):
1.  You can **ONLY** send messages to phone numbers you have **verified** in the Meta App Dashboard.
2.  Go to **WhatsApp** -> **API Setup**.
3.  Scroll to **To** field -> Click **Manage phone number list**.
4.  Add the phone numbers you want to test with (your own, your colleague's).
5.  **Verify them via OTP.**
6.  **ONLY** these numbers will receive messages from your app until you go Live.

### 5. Create Message Templates
To initiate conversations with users (e.g., sending a notification when they haven't messaged you recently), you **MUST** use Message Templates.

Go to **WhatsApp Manager** -> **Message Templates** and create the following:

#### Template 1: `new_inquiry_alert`
-   **Category**: Utility / Update
-   **Language**: English (US) (en_US)
-   **Body**:
    ```text
    🔔 New Inquiry Alert!
    
    A new inquiry {{1}} has been posted.
    
    Items: {{2}}
    
    Login now to submit your quote!
    ```
-   **Button** (Optional): Visit Website -> `https://your-domain.com/dashboard`

#### Template 2: `new_offer_alert`
-   **Category**: Utility / Update
-   **Body**:
    ```text
    💰 New Offer Received!
    
    Seller has submitted a quote for inquiry {{1}}.
    
    Price: ₹{{2}}/ton
    
    Login to review the offer.
    ```

#### Template 3: `offer_accepted_seller`
-   **Category**: Utility / Update
-   **Body**:
    ```text
    🎉 Offer Accepted!
    
    Your offer for {{1}} has been accepted!
    
    Buyer: {{2}}
    Contact: {{3}}
    
    Please contact them to proceed.
    ```

#### Template 4: `offer_accepted_buyer`
-   **Category**: Utility / Update
-   **Body**:
    ```text
    ✅ Offer Confirmed!
    
    You accepted the offer for {{1}}.
    
    Seller: {{2}}
    Contact: {{3}}
    
    Please contact them to proceed.
    ```

#### Template 5: `offer_rejected`
-   **Category**: Utility / Update
-   **Body**:
    ```text
    Update on your offer for {{1}}.
    
    Your offer was not selected this time / has been disqualified.
    
    Better luck next time!
    ```

#### Template 6: `bidding_started`
-   **Category**: Utility / Update
-   **Body**:
    ```text
    🔔 Bidding Started!
    
    Bidding activated for inquiry {{1}}.
    
    Items: {{2}}
    Deadline: {{3}}
    Days Remaining: {{4}}
    
    Submit your best quote now!
    ```

## Webhooks (Optional for receiving messages)
If you want to handle incoming messages (e.g., users replying), you need to configure Webhooks in the App Dashboard.
1.  **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`
2.  **Verify Token**: A random string you create (e.g., `my_secure_token`).

## Going Live (Removing Verification Requirement)

To send messages to **any** WhatsApp number without manual verification, you must move your app to **Live Mode**.

1.  **Complete Business Verification**: In Meta Business Settings, you must verify your business (requires legal documents).
2.  **Request Advanced Access**:
    -   Go to **App Review** -> **Permissions and Features**.
    -   Request advanced access for `whatsapp_business_messaging`.
3.  **Switch to Live Mode**:
    -   Toggle the "App Mode" switch at the top of the App Dashboard from **Development** to **Live**.
4.  **Add Payment Method**: You must add a credit card to your Meta Business Account for WhatsApp conversation charges.

Once Live, you can message any user who has opted in, using your approved templates.
