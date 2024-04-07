// bu örnek bir arayüz entegrasyonudur. Nasıl yapabileceğimiz konusunda bilgi vermek amacı ile tasarlanmıştır. Formunuza uygun şekilde düzenleyebilirsiniz.


import React, {useState} from "react";
import axios from 'axios';
import {useForm} from 'react-hook-form';
import Input from '@components/ui/input';
import Button from '@components/ui/button';
import jwt from 'jsonwebtoken';
import {useCart} from '@contexts/cart/cart.context';

// Kullanıcıdan alınacak bilgilerin tip tanımlamaları
interface CheckoutInputType {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
}

const CheckoutForm: React.FC = () => {
    const {register, handleSubmit, formState: {errors}} = useForm<CheckoutInputType>();
    const {items, total} = useCart();
    const [isPending, setIsPending] = useState(false);
    const [paymentError, setPaymentError] = useState<string>('');

    // Ödeme başlatma işlemi
    // Ödeme başlatma işlemi
    const onStartPaymentSubmit = async (input: CheckoutInputType) => {
        // Ödeme işlemi başladığı için bekleyen durumu aktif hale getiriyoruz.
        setIsPending(true);

        // Kullanıcının oturum açma bilgilerini yerel depolamadan alıyoruz.
        const token = localStorage.getItem('token');

        // Eğer oturum açma bilgisi yoksa, kullanıcıyı oturum açmaya yönlendiriyoruz.
        if (!token) {
            setPaymentError('Please log in to proceed.');
            setIsPending(false);
            return;
        }

        // Oturum açma bilgisini çözümlüyoruz.
        const decodedToken = jwt.decode(token);

        // Eğer çözümlenen bilgi geçerli değilse, kullanıcı kimlik doğrulaması hatası veriyoruz.
        if (!decodedToken || typeof decodedToken !== 'object' || !decodedToken.id) {
            setPaymentError('User authentication failed.');
            setIsPending(false);
            return;
        }

        // Sipariş detaylarını oluşturuyoruz.
        const orderDetails = {
            user: decodedToken.id,
            products: items.map(item => ({
                product: item.id,
                quantity: item.quantity,
                price: item.price,
            })),
            total,
            shipping_fee: 0,
            address: input,
        };

        try {
            // Sipariş detayları ile birlikte sipariş oluşturma isteği gönderiyoruz.
            const orderResponse = await axios.post('YOUR_BACKEND_API/orders', orderDetails, {
                headers: {Authorization: `Bearer ${token}`},
            });

            // Eğer sipariş oluşturma isteği başarısız olursa, hata veriyoruz.
            if (!orderResponse.data || !orderResponse.data._id) {
                throw new Error('Failed to create order.');
            }

            // Sipariş oluşturma başarılı olursa, ödeme başlatma isteği gönderiyoruz.
            const preAuthResponse = await axios.post('YOUR_BACKEND_API/start-payment', {
                orderId: orderResponse.data._id,
                amount: total * 100,
                currency: 949, // Örneğin Türk Lirası için
                callbackUrl: "YOUR_CALLBACK_URL"
            }, {
                headers: {Authorization: `Bearer ${token}`},
            });

            // Eğer ödeme başlatma isteği başarılı olursa, kullanıcıyı 3D Secure sayfasına yönlendiriyoruz.
            if (preAuthResponse.data && preAuthResponse.data.Code === 0) {
                window.location.href = `https://entegrasyon.tosla.com/api/Payment/threeDSecure/${preAuthResponse.data.ThreeDSessionId}`;
            } else {
                // Eğer ödeme başlatma isteği başarısız olursa, hata işleme kodlarını buraya ekleyebilirsiniz.
            }
        } catch (error) {
            // Eğer herhangi bir hata oluşursa, hatayı konsola yazdırıyoruz.
            console.error('Payment error:', error);
        } finally {
            // İşlem tamamlandığında, bekleyen durumu pasif hale getiriyoruz.
            setIsPending(false);
        }
    };

    return (
        <>
            <h2 className="text-lg md:text-xl xl:text-2xl font-bold text-heading mb-6 xl:mb-8">
                {'Kargo Adresi'}
            </h2>
            <form
                className="w-full mx-auto flex flex-col justify-center "
                noValidate
            >
                <div className="flex flex-col space-y-4 lg:space-y-5">
                    <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0">
                        <Input
                            labelKey="İsim"
                            {...register('firstName', {
                                required: 'İsim gerekli',
                            })}
                            errorKey={errors.firstName?.message}
                            variant="solid"
                            className="w-full lg:w-1/2 "
                        />
                        <Input
                            labelKey="Soyisim"
                            {...register('lastName', {
                                required: 'Soyisim gerekli',
                            })}
                            errorKey={errors.lastName?.message}
                            variant="solid"
                            className="w-full lg:w-1/2 ltr:lg:ml-3 rtl:lg:mr-3 mt-2 md:mt-0"
                        />
                    </div>
                    <Input
                        labelKey="Adres"
                        {...register('address', {
                            required: 'Adres gerekli',
                        })}
                        errorKey={errors.address?.message}
                        variant="solid"
                    />
                    <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0">
                        <Input
                            type="tel"
                            labelKey="Telefon"
                            {...register('phone', {
                                required: 'Telefon numarası gerekli',
                            })}
                            errorKey={errors.phone?.message}
                            variant="solid"
                            className="w-full lg:w-1/2 "
                        />

                        <Input
                            type="email"
                            labelKey="E-posta *"
                            {...register('email', {
                                required: 'E-posta gerekli',
                                pattern: {
                                    value:
                                        /^(([^<>()\[\].,;:\s@"]+(\.[^<>()\[\].,;:\s@"]+)*)|(".+"))@(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})$/,
                                    message: 'Geçersiz e-posta adresi',
                                },
                            })}
                            errorKey={errors.email?.message}
                            variant="solid"
                            className="w-full lg:w-1/2 ltr:lg:ml-3 rtl:lg:mr-3 mt-2 md:mt-0"
                        />
                    </div>
                    <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0">
                        <Input
                            labelKey="Şehir"
                            {...register('city')}
                            variant="solid"
                            className="w-full lg:w-1/2 "
                        />

                        <Input
                            labelKey="Posta Kodu"
                            {...register('zipCode')}
                            variant="solid"
                            className="w-full lg:w-1/2 ltr:lg:ml-3 rtl:lg:mr-3 mt-2 md:mt-0"
                        />

                    </div>
                    <div className="flex w-full">
                        <Button
                            onClick={handleSubmit(onStartPaymentSubmit)}
                            className="w-full sm:w-auto"
                            disabled={isPending}
                        >
                            {isPending ? 'Ödeme Formuna Yönlendiriliyor...Lütfen Bekleyiniz' : 'Ödemeyi Başlat'}
                        </Button>


                    </div>
                    {paymentError && <div>{paymentError}</div>}

                </div>
            </form>

        </>
    );
};

export default CheckoutForm;