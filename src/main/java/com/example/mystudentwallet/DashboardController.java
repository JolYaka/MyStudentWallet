package com.example.mystudentwallet;
import javafx.fxml.FXML;
import java.sql.*;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.VBox;
import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

public class DashboardController implements Initializable{
    @FXML
    VBox dashboardRoot;

    @FXML
    Button btnNouvTrans;

    @FXML
    Label labelSolde,labelRevenu,labelDepense;

    private double soldeActuel = 0.0;
    private double revenuActuel = 0.0;
    private double depenseActuel = 0.0;
    MainController mainController;
    public final String URL = "jdbc:sqlite:src/main/resources/com/example/mystudentwallet/myStudentWalletBD.db";

    @Override
    public void initialize(URL location, ResourceBundle resources){
        setLable();
        setupButton();
        sqlPart();
    }
    private void sqlPart(){
        try {
            String sqlIncome = "SELECT SUM(amount) AS income FROM Transactions WHERE type ='Revenu'";
            String sqlExpense = "SELECT SUM(amount) AS expense FROM Transactions WHERE type ='Dépense'";
            String sqlSolde = "SELECT (SELECT SUM(amount) FROM Transactions WHERE type ='Revenu') - (SELECT SUM(amount) FROM Transactions WHERE type ='Dépense') AS solde";
            Connection conn = DriverManager.getConnection(URL);
            PreparedStatement pstmtIncome = conn.prepareStatement(sqlIncome);
            ResultSet rsIn = pstmtIncome.executeQuery();
            PreparedStatement pstmtExpense = conn.prepareStatement(sqlExpense);
            ResultSet rsEx = pstmtExpense.executeQuery();
            PreparedStatement pstmtSolde = conn.prepareStatement(sqlSolde);
            ResultSet rsSolde = pstmtSolde.executeQuery();
            if (rsIn.next()) {
                double income = rsIn.getDouble("income");
                if (!rsIn.wasNull()) {
                    labelRevenu.setText(String.format("%.2f",income));
                } else {
                    labelRevenu.setText("0.00");
                }
            }
            if (rsEx.next()) {
                depenseActuel=rsEx.getDouble("expense");
                if(!rsEx.wasNull())
                    labelDepense.setText(String.format("%.2f",depenseActuel));
                else
                    labelDepense.setText("0.00");
            }
            if(rsSolde.next()){
                soldeActuel = rsSolde.getDouble("solde");
                if(!rsSolde.wasNull())
                    labelSolde.setText(String.format("%.2f",soldeActuel));
                else
                    labelSolde.setText("0.00");
            }
            conn.close();
        }
        catch(SQLException e){
            System.err.println("Le message d'erreur: "+e.getMessage());
        }
    }

    private void setLable(){
        labelSolde.setText(String.format("%.2f DT", soldeActuel));
        labelDepense.setText(String.format("%.2f DT", depenseActuel));
        labelRevenu.setText(String.format("%.2f DT", revenuActuel));
    }

    private void setupButton(){
        btnNouvTrans.setOnAction(e->{
            mainController.navigateToAddTransaction();
        });
    }
    private void loadAdd(){
       mainController.navigateToAddTransaction();
    }

    public void setMainController(MainController mainController){
        this.mainController=mainController;
    }
}
