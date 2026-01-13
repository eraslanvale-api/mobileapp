# Mac İçin Mobil Uygulama Kurulum Rehberi

Bu rehber, Premium Vale mobil uygulamasının Mac bilgisayarda sıfırdan kurulup çalıştırılması için gerekli adımları içerir.

## 1. Ön Hazırlıklar (Gereksinimler)

Mac terminalini açın ve aşağıdaki araçların kurulu olduğundan emin olun. Eğer kurulu değillerse yanlarındaki komutlarla kurabilirsiniz:

1.  **Homebrew** (Paket yöneticisi):
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
2.  **Node.js**:
    ```bash
    brew install node
    ```
3.  **Watchman** (React Native dosya izleme için):
    ```bash
    brew install watchman
    ```
4.  **CocoaPods** (iOS bağımlılıkları için):
    ```bash
    sudo gem install cocoapods
    ```
5.  **Xcode**: App Store'dan indirin ve kurun. Kurulum sonrası şu komutu çalıştırarak lisansı onaylayın:
    ```bash
    sudo xcodebuild -license
    ```

---

## 2. Uygulama Kurulumu (React Native / iOS)

Terminalde proje klasörünün (bu reponun) ana dizininde olduğunuzdan emin olun ve aşağıdaki adımları uygulayın.

1.  Gerekli kütüphaneleri yükleyin:
    ```bash
    npm install
    ```

2.  iOS proje dosyalarını oluşturun (Prebuild):
    ```bash
    npx expo prebuild --platform ios
    ```

3.  iOS bağımlılıklarını yükleyin:
    ```bash
    cd ios
    pod install
    cd ..
    ```

4.  Uygulamayı iOS Simülatöründe başlatın:
    ```bash
    npm run ios
    ```
    *(Veya `npx expo run:ios` komutunu kullanabilirsiniz)*

---

## Önemli Notlar

### Backend Bağlantısı
Mobil uygulama varsayılan olarak **canlı sunucuya** (`https://eraslan.pythonanywhere.com`) bağlanacak şekilde ayarlanmıştır. Herhangi bir backend kurulumu yapmanıza gerek yoktur; uygulama doğrudan çalışacaktır.

İyi çalışmalar!
