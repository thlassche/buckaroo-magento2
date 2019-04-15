/**
 *                  ___________       __            __
 *                  \__    ___/____ _/  |_ _____   |  |
 *                    |    |  /  _ \\   __\\__  \  |  |
 *                    |    | |  |_| ||  |   / __ \_|  |__
 *                    |____|  \____/ |__|  (____  /|____/
 *                                              \/
 *          ___          __                                   __
 *         |   |  ____ _/  |_   ____ _______   ____    ____ _/  |_
 *         |   | /    \\   __\_/ __ \\_  __ \ /    \ _/ __ \\   __\
 *         |   ||   |  \|  |  \  ___/ |  | \/|   |  \\  ___/ |  |
 *         |___||___|  /|__|   \_____>|__|   |___|  / \_____>|__|
 *                  \/                           \/
 *                  ________
 *                 /  _____/_______   ____   __ __ ______
 *                /   \  ___\_  __ \ /  _ \ |  |  \\____ \
 *                \    \_\  \|  | \/|  |_| ||  |  /|  |_| |
 *                 \______  /|__|    \____/ |____/ |   __/
 *                        \/                       |__|
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Creative Commons License.
 * It is available through the world-wide-web at this URL:
 * http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 * If you are unable to obtain it through the world-wide-web, please send an email
 * to servicedesk@tig.nl so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade this module to newer
 * versions in the future. If you wish to customize this module for your
 * needs please contact servicedesk@tig.nl for more information.
 *
 * @copyright Copyright (c) Total Internet Group B.V. https://tig.nl/copyright
 * @license   http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 */
/*browser:true*/
/*global define*/
define(
    [
        'jquery',
        'Magento_Checkout/js/view/payment/default',
        'Magento_Checkout/js/model/payment/additional-validators',
        'TIG_Buckaroo/js/action/place-order',
        'Magento_Checkout/js/model/quote',
        'ko',
        'Magento_Checkout/js/checkout-data',
        'Magento_Checkout/js/action/select-payment-method',
        'Magento_Ui/js/lib/knockout/bindings/datepicker'
        /*,
         'jquery/validate'*/
    ],
    function (
        $,
        Component,
        additionalValidators,
        placeOrderAction,
        quote,
        ko,
        checkoutData,
        selectPaymentMethodAction
    ) {
        'use strict';


        /**
         *  constants for backend settings
         */
        var BUSINESS_METHOD_BOTH = 3;

        var PAYMENT_METHOD_ACCEPTGIRO = 1;
        var PAYMENT_METHOD_DIGIACCEPT = 2;

        return Component.extend(
            {
                defaults                : {
                    template : 'TIG_Buckaroo/payment/tig_buckaroo_afterpay20',
                    businessMethod: null,
                    paymentMethod: null,
                    telephoneNumber: null,
                    selectedGender: null,
                    selectedBusiness: 1,
                    firstName: '',
                    lastName: '',
                    CustomerName: null,
                    BillingName: null,
                    country: '',
                    dateValidate: null,
                    termsUrl: 'https://www.afterpay.nl/nl/klantenservice/betalingsvoorwaarden/',
                    termsValidate: false,
                    genderValidate: null,
                    identificationValidate: null,
                    showGenderValue: null,
                    showIdentificationValue: null,
                },
                redirectAfterPlaceOrder : true,
                paymentFeeLabel : window.checkoutConfig.payment.buckaroo.afterpay20.paymentFeeLabel,
                currencyCode : window.checkoutConfig.quoteData.quote_currency_code,
                baseCurrencyCode : window.checkoutConfig.quoteData.base_currency_code,

                /**
                 * @override
                 */
                initialize : function (options) {
                    if (checkoutData.getSelectedPaymentMethod() == options.index) {
                        window.checkoutConfig.buckarooFee.title(this.paymentFeeLabel);
                    }

                    return this._super(options);
                },

                initObservable: function () {
                    this._super().observe(
                        [
                            'businessMethod',
                            'paymentMethod',
                            'telephoneNumber',
                            'selectedGender',
                            'selectedBusiness',
                            'firstname',
                            'lastname',
                            'CustomerName',
                            'BillingName',
                            'country',
                            'dateValidate',
                            'termsUrl',
                            'termsValidate',
                            'genderValidate',
                            'identificationValidate',
                            'dummy',
                            'showGenderValue',
                            'showIdentificationValue',
                        ]
                    );

                    this.showGender = ko.computed(
                        function () {
                            if (this.showGenderValue() !== null) {
                                return this.showGenderValue();
                            }
                        },
                        this
                    );

                    this.showIdentification = ko.computed(
                        function () {
                            if (this.showIdentificationValue() !== null) {
                                return this.showIdentificationValue();
                            }
                        },
                        this
                    );

                    this.businessMethod = window.checkoutConfig.payment.buckaroo.afterpay20.businessMethod;
                    this.paymentMethod  = window.checkoutConfig.payment.buckaroo.afterpay20.paymentMethod;

                    /**
                     * Observe customer first & lastname
                     * bind them together, so they could appear in the frontend
                     */
                    this.updateBillingName = function(firstname, lastname) {
                        this.firstName = firstname;
                        this.lastName = lastname;

                        this.CustomerName = ko.computed(
                            function () {
                                return this.firstName + " " + this.lastName;
                            },
                            this
                        );

                        this.BillingName(this.CustomerName());
                    };

                    this.updateTermsUrl = function(country) {
                        this.country = country;
                        var newUrl = '';

                        switch (this.paymentMethod) {
                            case PAYMENT_METHOD_ACCEPTGIRO:
                                newUrl = getAcceptgiroUrl();
                                break;
                            case PAYMENT_METHOD_DIGIACCEPT:
                                newUrl = getDigiacceptUrl();
                                break;
                            default:
                                newUrl = 'https://www.afterpay.nl/nl/algemeen/betalen-met-afterpay/betalingsvoorwaarden';
                                break;
                        }

                        this.termsUrl(newUrl);
                    };

                    var getAcceptgiroUrl = function() {
                        if (this.country === 'NL') {
                            return 'https://documents.myafterpay.com/consumer-terms-conditions/nl_nl/';
                        }
                        if (this.country === 'DE') {
                            return 'https://documents.myafterpay.com/consumer-terms-conditions/de_de/';
                        }
                        if (this.country === 'BE') {
                            return 'https://documents.myafterpay.com/consumer-terms-conditions/nl_be/';
                        }
                        if (this.country === 'AT') {
                            return 'https://documents.myafterpay.com/consumer-terms-conditions/de_at/';
                        }
                        if (this.country === 'FI') {
                            return 'https://documents.myafterpay.com/consumer-terms-conditions/fi_fi/';
                        }

                        return 'https://www.afterpay.nl/nl/algemeen/betalen-met-afterpay/betalingsvoorwaarden';
                    }.bind(this);

                    var getDigiacceptUrl = function() {
                        var url = 'https://www.afterpay.nl/nl/algemeen/betalen-met-afterpay/betalingsvoorwaarden';

                        if (this.country === 'NL') {
                            url = 'https://documents.myafterpay.com/consumer-terms-conditions/nl_nl/';
                        }
                        if (this.country === 'DE') {
                            url = 'https://documents.myafterpay.com/consumer-terms-conditions/de_de/';
                        }
                        if (this.country === 'BE') {
                            url = 'https://documents.myafterpay.com/consumer-terms-conditions/nl_be/';
                        }
                        if (this.country === 'AT') {
                            url = 'https://documents.myafterpay.com/consumer-terms-conditions/de_at/';
                        }
                        if (this.country === 'FI') {
                            url = 'https://documents.myafterpay.com/consumer-terms-conditions/fi_fi/';
                        }

                        return url;
                    }.bind(this);

                    if (quote.billingAddress()) {
                        this.updateBillingName(quote.billingAddress().firstname, quote.billingAddress().lastname);
                        this.updateTermsUrl(quote.billingAddress().countryId);
                    }

                    quote.billingAddress.subscribe(
                        function(newAddress) {
                            if (this.getCode() !== this.isChecked() ||
                                !newAddress ||
                                !newAddress.getKey()
                            ) {
                                return;
                            }

                            if (newAddress.firstname !== this.firstName || newAddress.lastname !== this.lastName) {
                                this.updateBillingName(newAddress.firstname, newAddress.lastname);
                            }

                            if (newAddress.countryId !== this.country) {
                                this.updateTermsUrl(newAddress.countryId);
                            }

                            if (this.country !== null && (this.country == 'NL' || this.country == 'BE')) {
                                this.showGenderValue(true);
                            } else {
                                this.showGenderValue(false);
                            }

                            if (this.country !== null && (this.country == 'FI')) {
                                this.showIdentificationValue(true);
                            } else {
                                this.showIdentificationValue(false);
                            }
                        }.bind(this)
                    );

                    /**
                     * observe radio buttons
                     * check if selected
                     */
                    var self = this;
                    this.setSelectedGender = function (value) {
                        self.selectedGender(value);
                        return true;
                    };

                    var updateSelectedBusiness = function () {
                        this.updateTermsUrl(this.country);
                    };

                    this.selectedBusiness.subscribe(updateSelectedBusiness, this);

                    /**
                     * Check if TelephoneNumber is filled in. If not - show field
                     */
                    this.hasTelephoneNumber = ko.computed(
                        function () {
                            var telephone = quote.billingAddress() ? quote.billingAddress().telephone : null;
                            return telephone != '' && telephone != '-';
                        }
                    );

                    /**
                     * Validation on the input fields
                     */

                    var runValidation = function () {
                        var elements = $('.' + this.getCode() + ' [data-validate]').filter(':not([name*="agreement"])');
                        if (this.country != 'NL' && this.country != 'BE') {
                            elements = elements.filter(':not([name*="customer_gender"])');
                        }
                        elements.valid();
                        this.selectPaymentMethod();
                    };

                    this.telephoneNumber.subscribe(runValidation,this);
                    this.dateValidate.subscribe(runValidation,this);
                    this.termsValidate.subscribe(runValidation,this);
                    this.genderValidate.subscribe(runValidation,this);
                    this.identificationValidate.subscribe(runValidation,this);
                    this.dummy.subscribe(runValidation,this);

                    /**
                     * Check if the required fields are filled. If so: enable place order button (true) | if not: disable place order button (false)
                     */
                    this.buttoncheck = ko.computed(
                        function () {
                            return (this.telephoneNumber() !== null || this.hasTelephoneNumber) &&
                            ((this.country != 'NL' && this.country != 'BE') || this.selectedGender() !== null) &&
                            this.BillingName() !== null &&
                            this.dateValidate() !== null &&
                            this.termsValidate() !== false &&
                            this.validate()
                        },
                        this
                    );

                    return this;
                },

                forceSelectedGender: function () {
                    this.selectedGender.valueHasMutated();
                    return true;
                },

                /**
                 * Place order.
                 *
                 * @todo To override the script used for placeOrderAction, we need to override the placeOrder method
                 *          on our parent class (Magento_Checkout/js/view/payment/default) so we can
                 *
                 *          placeOrderAction has been changed from Magento_Checkout/js/action/place-order to our own
                 *          version (TIG_Buckaroo/js/action/place-order) to prevent redirect and handle the response.
                 */
                placeOrder: function (data, event) {
                    var self = this,
                        placeOrder;

                    if (event) {
                        event.preventDefault();
                    }

                    if (this.validate() && additionalValidators.validate()) {
                        this.isPlaceOrderActionAllowed(false);
                        placeOrder = placeOrderAction(this.getData(), this.redirectAfterPlaceOrder, this.messageContainer);

                        $.when(placeOrder).fail(
                            function () {
                                self.isPlaceOrderActionAllowed(true);
                            }
                        ).done(this.afterPlaceOrder.bind(this));
                        return true;
                    }
                    return false;
                },

                magentoTerms: function() {
                    /**
                     * The agreement checkbox won't force an update of our bindings. So check for changes manually and notify
                     * the bindings if something happend. Use $.proxy() to access the local this object. The dummy property is
                     * used to notify the bindings.
                     **/
                    $('.payment-methods').one(
                        'click',
                        '.' + this.getCode() + ' [name*="agreement"]',
                        $.proxy(
                            function () {
                                this.dummy.notifySubscribers();
                            },
                            this
                        )
                    );

                },

                afterPlaceOrder: function () {
                    var response = window.checkoutConfig.payment.buckaroo.response;
                    response = $.parseJSON(response);
                    if (response.RequiredAction !== undefined && response.RequiredAction.RedirectURL !== undefined) {
                        window.location.replace(response.RequiredAction.RedirectURL);
                    }
                },

                selectPaymentMethod: function () {
                    window.checkoutConfig.buckarooFee.title(this.paymentFeeLabel);

                    selectPaymentMethodAction(this.getData());
                    checkoutData.setSelectedPaymentMethod(this.item.method);

                    if (quote.billingAddress()) {
                        this.updateBillingName(quote.billingAddress().firstname, quote.billingAddress().lastname);
                        this.updateTermsUrl(quote.billingAddress().countryId);
                    }

                    return true;
                },

                /**
                 * Run validation function
                 */

                validate: function () {
                    var elements = $('.' + this.getCode() + ' [data-validate]:not([name*="agreement"])');
                    if (this.country != 'NL' && this.country != 'BE') {
                        elements = elements.filter(':not([name*="customer_gender"])');
                    }
                    return elements.valid();
                },

                getData: function () {
                    var business = this.businessMethod;

                    if (business == BUSINESS_METHOD_BOTH) {
                        business = this.selectedBusiness();
                    }

                    return {
                        "method": this.item.method,
                        "po_number": null,
                        "additional_data": {
                            "customer_telephone" : this.telephoneNumber(),
                            "customer_gender" : this.genderValidate(),
                            "customer_indentificationNumber" : this.identificationValidate(),
                            "customer_billingName" : this.BillingName(),
                            "customer_DoB" : this.dateValidate(),
                            "termsCondition" : this.termsValidate(),
                            "selectedBusiness" : business
                        }
                    };
                }
            }
        );
    }
);
