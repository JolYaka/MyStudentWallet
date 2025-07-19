package com.example.mystudentwallet;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.stage.Stage;
import java.io.IOException;
import java.net.URL;

public class AppMain extends Application {
    @Override
    public void start(Stage stage) throws IOException {

        URL fxmlUrl = AppMain.class.getResource("/com/example/mystudentwallet/interfaceGraph/Main.fxml");
        System.out.println("FXML URL: " + fxmlUrl);

        if (fxmlUrl == null) {
            System.err.println(" Fichier Main.fxml introuvable ");
            System.err.println("Vérifiez le chemin : src/main/resources/com/example/mystudentwallet/interfaceGraph/Main.fxml");
            return;
        }

        FXMLLoader fxmlLoader = new FXMLLoader(fxmlUrl);
        Scene scene = new Scene(fxmlLoader.load(), 520, 740);
        stage.setTitle("My Student Wallet");
        stage.setScene(scene);

        stage.getIcons().addAll(
                new Image(getClass().getResourceAsStream("/com/example/mystudentwallet/imageIcon/icon32.png")),
                new Image(getClass().getResourceAsStream("/com/example/mystudentwallet/imageIcon/icon64.png")),
                new Image(getClass().getResourceAsStream("/com/example/mystudentwallet/imageIcon/icon128.png"))
        );
        stage.show();
    }

    public static void main(String[] args) {
        launch();
    }
}