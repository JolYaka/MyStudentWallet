package com.example.mystudentwallet;

import javafx.fxml.FXML;
import java.sql.*;
import javafx.fxml.Initializable;
import javafx.scene.control.Label;
import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

public class TransListController implements Initializable {
    @FXML
    Label descriptionLabel1,descriptionLabel2,descriptionLabel3,descriptionLabel4,dateLabel1,dateLabel2,dateLabel3,dateLabel4,amountLabel1,amountLabel2,amountLabel3,amountLabel4;
    public void initialize (URL location, ResourceBundle resource ){

    }
    private void setLabel(){
        descriptionLabel1.setText("Desciption récente");
        descriptionLabel2.setText("Desciption récente");
        descriptionLabel3.setText("Desciption récente");
        descriptionLabel4.setText("Desciption récente");
        dateLabel1.setText("XXXX-XX-XX");
        dateLabel2.setText("XXXX-XX-XX");
        dateLabel3.setText("XXXX-XX-XX");
        dateLabel.setText("XXXX-XX-XX");

    }
}
